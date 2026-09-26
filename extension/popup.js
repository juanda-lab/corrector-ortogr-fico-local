const DEFAULTS = { enabled: true, language: 'es', server: 'http://localhost:8081', dictionary: [], disabledSites: [] };
const $ = (id) => document.getElementById(id);

function newerThan(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function checkUpdate() {
  try {
    const r = await fetch(LINKS.releasesApi);
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
  $('status').textContent = 'Buscando el corrector…';
  $('serverHelp').hidden = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'ping' });
    if (res && res.ok) {
      $('dot').className = 'dot ok';
      $('status').textContent = 'Corrector funcionando';
      return;
    }
  } catch { /* cae abajo */ }
  $('dot').className = 'dot bad';
  $('status').textContent = 'No se detecta el corrector en tu PC';
  $('serverHelp').hidden = false;
}

$('downloadLink').href = LINKS.download;
$('guideLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});

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
  setupSite(s.disabledSites);
  checkServer();
});

$('version').textContent = chrome.runtime.getManifest().version;
checkUpdate();

$('enabled').addEventListener('change', (e) => chrome.storage.local.set({ enabled: e.target.checked }));
$('language').addEventListener('change', (e) => chrome.storage.local.set({ language: e.target.value }));
$('server').addEventListener('change', (e) => {
  chrome.storage.local.set({ server: e.target.value.trim() || DEFAULTS.server }).then(checkServer);
});


// Activar o desactivar en el sitio de la pestaña actual (el permiso activeTab da su URL
// solo mientras el usuario abre esta ventana)
async function setupSite(disabledSites) {
  let host = '';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (url.protocol === 'http:' || url.protocol === 'https:') host = url.hostname;
  } catch { /* pestaña sin URL accesible */ }
  if (!host) return;

  $('siteName').textContent = host;
  $('siteEnabled').checked = !disabledSites.includes(host);
  $('siteRow').hidden = false;
  $('siteEnabled').addEventListener('change', (e) => {
    chrome.storage.local.get('disabledSites', (s) => {
      const sites = new Set(s.disabledSites || []);
      if (e.target.checked) sites.delete(host); else sites.add(host);
      chrome.storage.local.set({ disabledSites: [...sites].sort() });
    });
  });
}