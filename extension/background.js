// Habla con el servidor local de LanguageTool. Las páginas no pueden llamar a
// localhost directamente (CORS / red privada), así que todo pasa por aquí.

const DEFAULTS = { enabled: true, language: 'es', server: 'http://localhost:8081' };

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg).then(sendResponse, (err) => sendResponse({ error: String(err && err.message || err) }));
  return true; // respuesta asíncrona
});

async function handle(msg) {
  const s = await getSettings();
  const server = s.server.replace(/\/+$/, '');

  if (msg.type === 'check') {
    const body = new URLSearchParams({ text: msg.text, language: s.language });
    const r = await fetch(server + '/v2/check', { method: 'POST', body });
    if (!r.ok) throw new Error('El servidor respondió ' + r.status);
    const data = await r.json();
    return { matches: data.matches || [] };
  }

  if (msg.type === 'ping') {
    const r = await fetch(server + '/v2/languages');
    return { ok: r.ok };
  }

  throw new Error('Mensaje desconocido: ' + msg.type);
}
