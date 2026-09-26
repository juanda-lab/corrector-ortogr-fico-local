const DEFAULTS = { enabled: true, language: 'es', server: 'http://localhost:8081', dictionary: [] };
// Repositorio de GitHub donde se publican las versiones ("usuario/repositorio").
// Vacío = no se comprueban actualizaciones.
const UPDATE_REPO = 'juanda-lab/corrector-ortogr-fico-local';
const $ = (id) => document.getElementById(id);

function newerThan(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checkUpdate() {
  if (!UPDATE_REPO) return;
  try {
    const r = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`);
    if (!r.ok) return;
    const release = await r.json();
    const latest = String(release.tag_name || '').replace(/^v/i, '');
    if (latest && newerThan(latest, chrome.runtime.getManifest().version)) {
      $('updateVersion').textContent = 'v' + latest;
      $('updateLink').href = release.html_url;
      $('update').hidden = false;
    }
  } catch { /* sin conexión: se ignora */ }
}

async function checkServer() {
  $('dot').className = 'dot';
  $('status').textContent = 'Comprobando servidor…';
  $('statusHint').textContent = '';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'ping' });
    if (res && res.ok) {
      $('dot').className = 'dot ok';
      $('status').textContent = 'Servidor funcionando';
      return;
    }
  } catch { /* cae abajo */ }
  $('dot').className = 'dot bad';
  $('status').textContent = 'Servidor apagado';
  $('statusHint').textContent = 'Ejecuta instalar.bat o reinicia el PC y espera unos 20 segundos.';
}

function renderDictionary(words) {
  const ul = $('dict');
  ul.textContent = '';
  if (!words.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'Vacío. Usa "Añadir al diccionario" en una palabra.';
    ul.append(li);
    return;
  }
  for (const w of words) {
    const li = document.createElement('li');
    li.append(w);
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Quitar';
    del.addEventListener('click', () => {
      const next = words.filter((x) => x !== w);
      chrome.storage.local.set({ dictionary: next });
      renderDictionary(next);
    });
    li.append(del);
    ul.append(li);
  }
}

chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
  const s = { ...DEFAULTS, ...stored };
  $('enabled').checked = s.enabled;
  $('language').value = s.language;
  $('server').value = s.server;
  renderDictionary(s.dictionary);
  checkServer();
});

$('version').textContent = chrome.runtime.getManifest().version;
checkUpdate();

$('enabled').addEventListener('change', (e) => chrome.storage.local.set({ enabled: e.target.checked }));
$('language').addEventListener('change', (e) => chrome.storage.local.set({ language: e.target.value }));
$('server').addEventListener('change', (e) => {
  chrome.storage.local.set({ server: e.target.value.trim() || DEFAULTS.server }).then(checkServer);
});
