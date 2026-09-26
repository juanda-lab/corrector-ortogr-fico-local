// Corrector Local: detecta el campo donde escribes, manda el texto al servidor
// local de LanguageTool, subraya los errores y muestra sugerencias al hacer clic.
(() => {
  if (window.__correctorLocal) return;
  window.__correctorLocal = true;

  const DEBOUNCE_MS = 700;
  const MAX_CHARS = 20000;
  const MAX_SUGGESTIONS = 6;
  const HAS_HIGHLIGHTS = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';

  let enabled = true;
  let siteDisabled = false; // el usuario lo desactivó para este sitio
  let dictionary = new Set();
  const ignored = new Set(); // "regla|palabra" ignorados en esta página

  let active = null; // objetivo actual (EditableTarget o FieldTarget)
  let timer = null;
  let requestId = 0;
  let popupHost = null; // ventanita de sugerencias (se crea al primer uso)

  // ---------- Ajustes ----------

  const isOn = () => enabled && !siteDisabled;

  function applySettings(s) {
    if ('enabled' in s) enabled = s.enabled !== false;
    if ('disabledSites' in s) siteDisabled = (s.disabledSites || []).includes(location.hostname);
    if (!isOn()) { hidePopup(); active && active.clear(); }
  }

  chrome.storage.local.get(['enabled', 'disabledSites'], applySettings);

  // Diccionario personal (storage.sync, ver dict.js)
  DICT.load().then((words) => { dictionary = new Set(words); }).catch(() => {});
  DICT.onChange((words) => { dictionary = new Set(words); schedule(0); });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const s = {};
    for (const k of Object.keys(changes)) s[k] = changes[k].newValue;
    applySettings(s);
    schedule(0); // idioma, sitio o diccionario cambiados: revisar de nuevo
  });

  // ---------- Utilidades ----------

  function kindOf(m) {
    return m.rule && m.rule.issueType === 'misspelling' ? 'spell' : 'other';
  }

  // Algunas reglas sugieren la palabra con la puntuación que ya sigue en el texto
  // (p. ej. "ola," -> "hola,"): se quita para no duplicarla.
  function trimTrailingPunct(value, after) {
    const p = value.match(/[.,;:!?]+$/);
    return p && after.startsWith(p[0]) ? value.slice(0, -p[0].length) : value;
  }

  function keep(m) {
    if (m.kind === 'spell' && dictionary.has(m.word.toLowerCase())) return false;
    // Palabras alargadas a propósito en chats: "holaaa", "siii", "nooo"
    if (m.kind === 'spell' && /(\p{L})\1\1/u.test(m.word)) return false;
    if (ignored.has(m.rule.id + '|' + m.word)) return false;
    return true;
  }

  function setHighlights(spell, other) {
    if (!HAS_HIGHLIGHTS) return;
    CSS.highlights.set('cl-spell', new Highlight(...spell));
    CSS.highlights.set('cl-other', new Highlight(...other));
  }

  function editingHost(el) {
    let host = el;
    while (host.parentElement && host.parentElement.isContentEditable) host = host.parentElement;
    return host;
  }

  const TEXT_INPUTS = new Set(['text', 'search', 'email', 'url', '']);

  function targetFor(el) {
    if (!el || el.nodeType !== 1) return null;
    if (el.closest('.cl-popup-host')) return null;
    if (el.tagName === 'TEXTAREA' && !el.readOnly && !el.disabled) return el;
    if (el.tagName === 'INPUT' && TEXT_INPUTS.has((el.getAttribute('type') || '').toLowerCase()) && !el.readOnly && !el.disabled) return el;
    if (el.isContentEditable) return editingHost(el);
    return null;
  }

  // ---------- Editores enriquecidos (contenteditable: WhatsApp, Gmail...) ----------

  const BLOCK = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE|TR|TABLE|SECTION|ARTICLE)$/;

  function extract(root) {
    let text = '';
    const segs = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) {
        const v = n.nodeValue;
        if (v) { segs.push({ node: n, start: text.length, end: text.length + v.length }); text += v; }
      } else if (n.tagName === 'BR') {
        text += '\n';
      } else if (n.tagName === 'IMG') {
        text += ' '; // emojis como imagen: separan palabras
      } else if (BLOCK.test(n.tagName) && text && !text.endsWith('\n')) {
        text += '\n';
      }
    }
    return { text, segs };
  }

  function pointAt(segs, pos, isEnd) {
    for (const s of segs) {
      if (isEnd ? (pos > s.start && pos <= s.end) : (pos >= s.start && pos < s.end)) return [s.node, pos - s.start];
    }
    return null;
  }

  class EditableTarget {
    constructor(root) {
      this.el = root;
      this.matches = [];
      this.snap = null;
      // Algunos editores (Google Sheets) cambian el texto sin lanzar eventos "input"
      this.observer = new MutationObserver(() => { if (active === this) schedule(); });
      this.observer.observe(root, { characterData: true, childList: true, subtree: true });
    }

    snapshot() { return (this.snap = extract(this.el)); }

    render(matches) {
      this.matches = [];
      const spell = [], other = [];
      for (const m of matches) {
        const a = pointAt(this.snap.segs, m.offset, false);
        const b = pointAt(this.snap.segs, m.offset + m.length, true);
        if (!a || !b) continue;
        const r = document.createRange();
        try { r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); } catch { continue; }
        m.range = r;
        this.matches.push(m);
        (m.kind === 'spell' ? spell : other).push(r);
      }
      setHighlights(spell, other);
    }

    matchAtCaret() {
      const sel = window.getSelection();
      if (!sel.rangeCount || !sel.isCollapsed) return null;
      const { startContainer, startOffset } = sel.getRangeAt(0);
      return this.matches.find((m) => {
        try { return m.range.startContainer.isConnected && m.range.isPointInRange(startContainer, startOffset); }
        catch { return false; }
      }) || null;
    }

    // Último error que empieza antes del cursor (para Alt+Enter)
    matchBeforeCaret() {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;
      const caret = sel.getRangeAt(0);
      let best = null;
      for (const m of this.matches) {
        try {
          if (m.range.startContainer.isConnected && m.range.compareBoundaryPoints(Range.START_TO_START, caret) <= 0) best = m;
        } catch { /* rango de otro nodo raíz */ }
      }
      return best;
    }

    rectFor(m) { return m.range.getBoundingClientRect(); }

    apply(m, replacement) {
      this.el.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(m.range.cloneRange());
      document.execCommand('insertText', false, replacement);
    }

    clear() { this.matches = []; setHighlights([], []); }
    destroy() { this.observer.disconnect(); this.clear(); }
  }

  // ---------- Campos simples (textarea / input) con capa espejo ----------

  const COPY_STYLES = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch',
    'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent', 'textTransform', 'textAlign',
    'tabSize', 'direction', 'boxSizing',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  ];

  class FieldTarget {
    constructor(el) {
      this.el = el;
      this.matches = [];
      this.spans = new Map();
      this.div = document.createElement('div');
      this.div.className = 'cl-mirror';
      document.documentElement.appendChild(this.div);
      this.sync = this.sync.bind(this);
      el.addEventListener('scroll', this.sync);
      window.addEventListener('scroll', this.sync, true);
      window.addEventListener('resize', this.sync);
      this.ro = new ResizeObserver(this.sync);
      this.ro.observe(el);
    }

    snapshot() { return (this.snap = { text: this.el.value }); }

    render(matches) {
      const text = this.snap.text;
      this.div.textContent = '';
      this.spans.clear();
      this.matches = [];
      let pos = 0;
      for (const m of [...matches].sort((a, b) => a.offset - b.offset)) {
        if (m.offset < pos) continue; // solapados
        this.div.append(text.slice(pos, m.offset));
        const span = document.createElement('span');
        span.className = 'cl-u cl-' + m.kind;
        span.textContent = text.slice(m.offset, m.offset + m.length);
        this.div.append(span);
        this.spans.set(m, span);
        this.matches.push(m);
        pos = m.offset + m.length;
      }
      this.div.append(text.slice(pos) + '​');
      this.sync();
    }

    sync() {
      const el = this.el;
      if (!el.isConnected) { this.destroy(); return; }
      const cs = getComputedStyle(el);
      const st = this.div.style;
      for (const p of COPY_STYLES) st[p] = cs[p];
      const isArea = el.tagName === 'TEXTAREA';
      st.whiteSpace = isArea ? 'pre-wrap' : 'pre';
      st.overflowWrap = isArea ? 'break-word' : 'normal';
      // Compensa la barra de desplazamiento del textarea, que el espejo no tiene
      const scrollbar = el.offsetWidth - el.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);
      if (scrollbar > 0) st.paddingRight = (parseFloat(cs.paddingRight) + scrollbar) + 'px';
      const r = el.getBoundingClientRect();
      st.left = r.left + 'px';
      st.top = r.top + 'px';
      st.width = r.width + 'px';
      st.height = r.height + 'px';
      st.display = r.width && r.height ? 'block' : 'none';
      if (!isArea) st.lineHeight = cs.height === 'auto' ? cs.lineHeight : (r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth)) + 'px';
      this.div.scrollTop = el.scrollTop;
      this.div.scrollLeft = el.scrollLeft;
    }

    matchAtCaret() {
      const { selectionStart: s, selectionEnd: e } = this.el;
      if (s !== e) return null;
      return this.matches.find((m) => s >= m.offset && s <= m.offset + m.length) || null;
    }

    matchBeforeCaret() {
      const s = this.el.selectionStart;
      let best = null;
      for (const m of this.matches) if (m.offset <= s) best = m;
      return best;
    }

    rectFor(m) { return this.spans.get(m).getBoundingClientRect(); }

    apply(m, replacement) {
      const el = this.el;
      el.focus();
      el.setSelectionRange(m.offset, m.offset + m.length);
      if (!document.execCommand('insertText', false, replacement)) {
        el.setRangeText(replacement, m.offset, m.offset + m.length, 'end');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    clear() { this.matches = []; this.spans.clear(); this.div.textContent = ''; }

    destroy() {
      this.clear();
      this.div.remove();
      this.ro.disconnect();
      this.el.removeEventListener('scroll', this.sync);
      window.removeEventListener('scroll', this.sync, true);
      window.removeEventListener('resize', this.sync);
      if (active === this) active = null;
    }
  }

  // ---------- Revisión ----------

  function activate(el) {
    if (active && active.el === el) return;
    hidePopup();
    if (active) active.destroy();
    active = el.isContentEditable ? new EditableTarget(el) : new FieldTarget(el);
    schedule(0);
  }

  function schedule(delay = DEBOUNCE_MS) {
    clearTimeout(timer);
    timer = setTimeout(runCheck, delay);
  }

  async function runCheck() {
    const t = active;
    if (!t || !isOn()) return;
    const { text } = t.snapshot();
    const trimmed = text.trim();
    // Muy corto, demasiado largo o una fórmula de hoja de cálculo (=SUMA(...))
    if (trimmed.length < 2 || text.length > MAX_CHARS || trimmed.startsWith('=')) { t.render([]); return; }

    const id = ++requestId;
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: 'check', text });
    } catch {
      return; // extensión recargada o servidor caído
    }
    if (id !== requestId || t !== active) return;
    if (!res || res.error) { t.render([]); return; }

    // Si el texto cambió mientras esperábamos, ya hay otra revisión en camino
    if (t.snapshot().text !== text) return;

    const matches = res.matches
      .map((m) => {
        const after = text.slice(m.offset + m.length);
        const replacements = (m.replacements || []).map((r) => ({ ...r, value: trimTrailingPunct(r.value, after) }));
        return { ...m, replacements, word: text.substr(m.offset, m.length), kind: kindOf(m) };
      })
      .filter(keep);
    t.render(matches);
  }

  document.addEventListener('focusin', (e) => {
    const el = targetFor(e.target);
    if (el) activate(el);
  }, true);

  // Si el campo ya tenía el foco antes de cargar la extensión (Google Sheets lo hace),
  // se activa al escribir en él.
  function onTyping(e) {
    if (!active || !active.el.contains(e.target)) {
      const el = targetFor(e.target);
      if (!el) return;
      activate(el);
      return;
    }
    hidePopup();
    schedule();
  }

  document.addEventListener('input', onTyping, true);
  document.addEventListener('keydown', (e) => {
    if (!active || !active.el.contains(e.target)) onTyping(e);
  }, true);

  // ---------- Ventanita de sugerencias ----------

  function buildPopup() {
    popupHost = document.createElement('div');
    popupHost.className = 'cl-popup-host';
    popupHost.style.cssText = 'all:initial;position:fixed;z-index:2147483647;top:0;left:0;';
    const shadow = popupHost.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        .card {
          --bg: #ffffff; --fg: #1c1d1f; --muted: #6b6f76; --line: #e6e7ea;
          --chip: #eef4ff; --chip-fg: #1d4ed8; --chip-hover: #dbe7ff;
          position: fixed; max-width: 320px; min-width: 200px;
          background: var(--bg); color: var(--fg);
          border: 1px solid var(--line); border-radius: 10px;
          box-shadow: 0 8px 28px rgba(0,0,0,.18);
          font: 13px/1.4 "Segoe UI", system-ui, sans-serif; padding: 10px 12px;
        }
        @media (prefers-color-scheme: dark) {
          .card { --bg: #202124; --fg: #e8eaed; --muted: #9aa0a6; --line: #3c4043;
                  --chip: #1f3a66; --chip-fg: #cfe0ff; --chip-hover: #29497d; }
        }
        .kind { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600;
                text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .msg { margin: 6px 0 8px; }
        .reps { display: flex; flex-wrap: wrap; gap: 6px; }
        .rep { border: 0; border-radius: 6px; padding: 5px 10px; cursor: pointer; font: 600 13px "Segoe UI", system-ui, sans-serif;
               background: var(--chip); color: var(--chip-fg); }
        .rep:hover { background: var(--chip-hover); }
        .none { color: var(--muted); font-style: italic; }
        .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line); }
        .act { border: 0; background: none; padding: 0; cursor: pointer; color: var(--muted);
               font: 12px "Segoe UI", system-ui, sans-serif; }
        .act:hover { color: var(--fg); text-decoration: underline; }
        .tip { margin-left: auto; color: var(--muted); font-size: 11px; }
        kbd { font: 10px Consolas, monospace; border: 1px solid var(--line); border-radius: 3px; padding: 0 3px; }
      </style>
      <div class="card" role="dialog"></div>`;
    // Evita que el editor pierda el foco/selección al pulsar la ventanita
    shadow.addEventListener('mousedown', (e) => e.preventDefault());
  }

  function showPopup(target, m) {
    if (!popupHost) buildPopup();
    const card = popupHost.shadowRoot.querySelector('.card');
    card.textContent = '';

    const kind = document.createElement('div');
    kind.className = 'kind';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = m.kind === 'spell' ? '#e5484d' : '#e3a008';
    kind.append(dot, m.kind === 'spell' ? 'Ortografía' : (m.rule.category && m.rule.category.name) || 'Gramática');

    const msg = document.createElement('div');
    msg.className = 'msg';
    msg.textContent = m.message;

    const reps = document.createElement('div');
    reps.className = 'reps';
    const list = (m.replacements || []).slice(0, MAX_SUGGESTIONS);
    if (!list.length) {
      const none = document.createElement('span');
      none.className = 'none';
      none.textContent = 'Sin sugerencias';
      reps.append(none);
    }
    for (const r of list) {
      const b = document.createElement('button');
      b.className = 'rep';
      b.textContent = r.value || '(borrar)';
      b.addEventListener('click', () => applyFix(target, m, r.value));
      reps.append(b);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const ignore = document.createElement('button');
    ignore.className = 'act';
    ignore.textContent = 'Ignorar';
    ignore.addEventListener('click', () => {
      ignored.add(m.rule.id + '|' + m.word);
      hidePopup();
      schedule(0);
    });
    actions.append(ignore);
    if (m.kind === 'spell') {
      const add = document.createElement('button');
      add.className = 'act';
      add.textContent = 'Añadir al diccionario';
      add.addEventListener('click', () => {
        hidePopup();
        dictionary.add(m.word.toLowerCase()); // efecto inmediato; se guarda y sincroniza aparte
        schedule(0);
        DICT.add(m.word).catch(() => {});
      });
      actions.append(add);
    }

    // Reportar una sugerencia equivocada: abre un aviso en GitHub que el usuario revisa antes de enviar
    const report = document.createElement('button');
    report.className = 'act';
    report.textContent = 'Reportar';
    report.title = 'Avisar de que esta sugerencia está mal (abre GitHub; tú revisas el texto antes de enviarlo)';
    report.addEventListener('click', () => {
      hidePopup();
      chrome.runtime.sendMessage({
        type: 'report',
        sentence: m.sentence || (m.context && m.context.text) || '',
        word: m.word,
        suggestion: (m.replacements && m.replacements[0] && m.replacements[0].value) || '',
        rule: m.rule && m.rule.id,
      }).catch(() => {});
    });
    actions.append(report);

    if (list.length) {
      const tip = document.createElement('span');
      tip.className = 'tip';
      tip.title = 'Aplica la primera sugerencia sin usar el ratón';
      const k = document.createElement('kbd');
      k.textContent = 'Alt+Enter';
      tip.append(k);
      actions.append(tip);
    }

    card.append(kind, msg, reps, actions);
    if (!popupHost.isConnected) document.documentElement.appendChild(popupHost);

    // Posición: debajo de la palabra, o encima si no cabe
    const r = target.rectFor(m);
    const w = card.offsetWidth, h = card.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function hidePopup() {
    if (popupHost && popupHost.isConnected) popupHost.remove();
  }

  document.addEventListener('click', (e) => {
    if (!active || !isOn() || !active.el.contains(e.target)) return;
    // Espera a que el navegador coloque el cursor donde se hizo clic
    setTimeout(() => {
      const m = active && active.matchAtCaret();
      if (m) showPopup(active, m); else hidePopup();
    }, 0);
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (popupHost && e.target !== popupHost) hidePopup();
  }, true);

  function applyFix(target, m, value) {
    hidePopup();
    target.apply(m, value);
    target.clear();
    schedule(150);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePopup();

    // Alt+Enter: corrige con la primera sugerencia el error del cursor, o el anterior más cercano
    if (e.key === 'Enter' && e.altKey && !e.ctrlKey && !e.shiftKey && active && isOn() && active.el.contains(e.target)) {
      const m = active.matchAtCaret() || active.matchBeforeCaret();
      if (!m || !m.replacements || !m.replacements.length) return;
      e.preventDefault();
      e.stopPropagation();
      applyFix(active, m, m.replacements[0].value);
    }
  }, true);

  window.addEventListener('scroll', (e) => {
    if (popupHost && popupHost.isConnected && !(active && active.el === e.target)) hidePopup();
  }, true);

  // Si el foco ya estaba en un campo al cargar la extensión
  const initial = targetFor(document.activeElement);
  if (initial) activate(initial);
})();
