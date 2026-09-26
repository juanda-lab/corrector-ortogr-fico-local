// Habla con el servidor local de LanguageTool. Las páginas no pueden llamar a
// localhost directamente (CORS / red privada), así que todo pasa por aquí.
// También: aviso de estado en el icono y menú del clic derecho.
importScripts('links.js', 'dict.js');

const DEFAULTS = { enabled: true, language: 'es', server: 'http://localhost:8081' };

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

// ---------- Instalación y menú del clic derecho ----------

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // Al instalar la extensión (p. ej. desde la tienda) se muestra cómo conseguir el corrector para Windows
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  // Al quitar la extensión, el navegador abre esta página: explica cómo desinstalar también el
  // corrector de Windows, que si no seguiría arrancando con el PC. Es una dirección fija, sin datos.
  chrome.runtime.setUninstallURL(LINKS.uninstall);

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'cl-add', title: 'Añadir «%s» a Mi diccionario', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'cl-report', title: 'Reportar: Corrector Local no detectó un error aquí', contexts: ['selection'] });
  });
  chrome.alarms.create('cl-estado', { periodInMinutes: 1 });
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('cl-estado', { periodInMinutes: 1 });
  updateBadge();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const text = (info.selectionText || '').trim();
  if (!text) return;
  if (info.menuItemId === 'cl-add') {
    // Solo palabras sueltas: una selección larga se añade palabra por palabra
    const words = text.split(/[\s,;.!?¿¡()"«»]+/).filter((w) => /\p{L}/u.test(w) && w.length > 1).slice(0, 20);
    if (words.length) await DICT.add(...words);
  } else if (info.menuItemId === 'cl-report') {
    const version = chrome.runtime.getManifest().version;
    chrome.tabs.create({ url: reportUrl({
      title: 'No detecta: ' + text.slice(0, 60),
      body: reportBody({ tipo: 'no-detectado', frase: text, version }),
    }) });
  }
});

// ---------- Aviso de estado en el icono ----------
// «!» rojo: el corrector de Windows no responde · «OFF» gris: desactivado por el usuario

let lastBadge = '';
async function setBadge(state) {
  // Una comprobación que termina tarde no debe tapar el «OFF» si el usuario lo desactivó mientras tanto
  if (state !== 'off' && !(await getSettings()).enabled) state = 'off';
  if (state === lastBadge) return;
  lastBadge = state;
  const opts = {
    ok:   { text: '',    color: '#16a34a', title: 'Corrector Local' },
    down: { text: '!',   color: '#dc2626', title: 'Corrector Local: no se detecta el corrector en tu PC. Haz clic para ver cómo solucionarlo.' },
    off:  { text: 'OFF', color: '#6b7280', title: 'Corrector Local: desactivado' },
  }[state];
  await chrome.action.setBadgeText({ text: opts.text });
  await chrome.action.setBadgeBackgroundColor({ color: opts.color });
  await chrome.action.setTitle({ title: opts.title });
}

async function updateBadge() {
  const s = await getSettings();
  if (!s.enabled) return setBadge('off');
  try {
    const r = await fetch(s.server.replace(/\/+$/, '') + '/v2/languages', { signal: AbortSignal.timeout(4000) });
    setBadge(r.ok ? 'ok' : 'down');
  } catch {
    setBadge('down');
  }
}

chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'cl-estado') updateBadge(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.enabled || changes.server)) updateBadge();
});

// ---------- Mensajes desde las páginas y la ventana de la extensión ----------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg).then(sendResponse, (err) => sendResponse({ error: String(err && err.message || err) }));
  return true; // respuesta asíncrona
});

async function handle(msg) {
  const s = await getSettings();
  const server = s.server.replace(/\/+$/, '');

  if (msg.type === 'check') {
    const body = new URLSearchParams({ text: msg.text, language: s.language });
    // En español, la regla propia CL_E_SUELTA sustituye a E_SINGLE_CHAR, que tapaba las correcciones «e» → «he»
    if (/^(es|auto)/.test(s.language)) body.set('disabledRules', 'E_SINGLE_CHAR');
    let r;
    try {
      r = await fetch(server + '/v2/check', { method: 'POST', body });
    } catch (err) {
      setBadge('down');
      throw err;
    }
    if (!r.ok) throw new Error('El servidor respondió ' + r.status);
    setBadge('ok');
    const data = await r.json();
    return { matches: data.matches || [] };
  }

  if (msg.type === 'ping') {
    try {
      const r = await fetch(server + '/v2/languages');
      setBadge(r.ok ? 'ok' : 'down');
      return { ok: r.ok };
    } catch {
      setBadge('down');
      return { ok: false };
    }
  }

  if (msg.type === 'report') {
    // Reportar una sugerencia equivocada desde la ventanita de sugerencias
    const version = chrome.runtime.getManifest().version;
    await chrome.tabs.create({ url: reportUrl({
      title: 'Sugerencia incorrecta: ' + (msg.word || '').slice(0, 40),
      body: reportBody({ tipo: 'falso-positivo', frase: msg.sentence, palabra: msg.word, sugerencia: msg.suggestion, regla: msg.rule, version }),
    }) });
    return { ok: true };
  }

  throw new Error('Mensaje desconocido: ' + msg.type);
}
