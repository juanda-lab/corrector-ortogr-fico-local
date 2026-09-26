const DEFAULTS = { enabled: true, language: 'es', server: 'http://localhost:8081', disabledSites: [] };
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

$('downloadLink').href = LINKS.installer;
$('guideLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});

// El diccionario se gestiona en su propia página (diccionario.html); aquí solo el contador
DICT.load().then((words) => {
  $('dictCount').textContent = words.length === 1 ? '1 palabra' : `${words.length} palabras`;
});
$('openDict').addEventListener('click', () => chrome.runtime.openOptionsPage());

chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
  const s = { ...DEFAULTS, ...stored };
  $('enabled').checked = s.enabled;
  $('language').value = s.language;
  $('server').value = s.server;
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