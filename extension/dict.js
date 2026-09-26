// Diccionario personal. Se guarda en chrome.storage.sync, así que se sincroniza entre
// los PCs donde el navegador tenga la misma cuenta y la sincronización activada.
// Se guarda en trozos porque cada clave de storage.sync admite unos 8 KB.
const DICT = (() => {
  const PREFIX = 'dict_';
  const MAX_CHUNK_BYTES = 7000;
  const MAX_CHUNKS = 12; // ~84 KB, dentro del límite de 100 KB de storage.sync

  const normalize = (words) =>
    [...new Set(words.map((w) => String(w).trim().toLowerCase()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));

  async function load() {
    const all = await chrome.storage.sync.get(null);
    const n = all.dict_n || 0;
    if (!n) {
      // Migración: hasta la versión 1.2 el diccionario estaba en storage.local
      const { dictionary } = await chrome.storage.local.get('dictionary');
      if (dictionary && dictionary.length) {
        const words = await save(dictionary);
        await chrome.storage.local.remove('dictionary');
        return words;
      }
    }
    let words = [];
    for (let i = 0; i < n; i++) words = words.concat(all[PREFIX + i] || []);
    return words;
  }

  async function save(list) {
    const words = normalize(list);
    const chunks = [];
    let current = [], size = 2;
    for (const w of words) {
      const s = new TextEncoder().encode(JSON.stringify(w)).length + 1;
      if (size + s > MAX_CHUNK_BYTES && current.length) { chunks.push(current); current = []; size = 2; }
      current.push(w);
      size += s;
    }
    if (current.length) chunks.push(current);
    if (chunks.length > MAX_CHUNKS) throw new Error('El diccionario es demasiado grande para sincronizarse (máximo unas 7.000 palabras).');

    const before = (await chrome.storage.sync.get('dict_n')).dict_n || 0;
    const data = { dict_n: chunks.length };
    chunks.forEach((c, i) => { data[PREFIX + i] = c; });
    await chrome.storage.sync.set(data);
    const stale = [];
    for (let i = chunks.length; i < before; i++) stale.push(PREFIX + i);
    if (stale.length) await chrome.storage.sync.remove(stale);
    return words;
  }

  async function add(...words) { return save((await load()).concat(words)); }

  async function remove(word) {
    const w = String(word).toLowerCase();
    return save((await load()).filter((x) => x !== w));
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && Object.keys(changes).some((k) => k === 'dict_n' || k.startsWith(PREFIX))) {
        load().then(callback);
      }
    });
  }

  return { load, save, add, remove, onChange, normalize };
})();
