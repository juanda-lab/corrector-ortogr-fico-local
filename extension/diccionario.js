const $ = (id) => document.getElementById(id);
let words = [];

function message(text, ok = true) {
  $('msg').textContent = text;
  $('msg').className = 'msg ' + (ok ? 'ok' : 'bad');
}

function render() {
  const q = $('search').value.trim().toLowerCase();
  const shown = q ? words.filter((w) => w.includes(q)) : words;
  $('count').textContent = (words.length === 1 ? '1 palabra' : `${words.length} palabras`) +
    (q ? ` · ${shown.length} coinciden con la búsqueda` : '');
  const ul = $('list');
  ul.textContent = '';
  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = words.length ? 'Ninguna palabra coincide.' : 'Vacío. Añade palabras arriba o con "Añadir al diccionario" al corregir.';
    ul.append(li);
    return;
  }
  for (const w of shown) {
    const li = document.createElement('li');
    li.append(w);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '✕';
    del.title = `Quitar «${w}»`;
    del.addEventListener('click', async () => {
      words = await DICT.remove(w);
      render();
      message(`Se quitó «${w}».`);
    });
    li.append(del);
    ul.append(li);
  }
}

// Separa por comas, punto y coma, espacios o saltos de línea
const parse = (text) => text.split(/[\s,;]+/).map((w) => w.trim()).filter(Boolean);

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nuevas = parse($('newWord').value);
  if (!nuevas.length) return;
  try {
    const antes = words.length;
    words = await DICT.add(...nuevas);
    $('newWord').value = '';
    render();
    const n = words.length - antes;
    message(n ? `Añadidas ${n} palabra(s).` : 'Esas palabras ya estaban en tu diccionario.');
  } catch (err) { message(err.message, false); }
});

$('search').addEventListener('input', render);

$('export').addEventListener('click', () => {
  const blob = new Blob([words.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'corrector-local-diccionario.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  try {
    const nuevas = parse(await file.text());
    const antes = words.length;
    words = await DICT.add(...nuevas);
    render();
    message(`Importadas ${words.length - antes} palabra(s) nuevas de «${file.name}».`);
  } catch (err) { message(err.message, false); }
  $('file').value = '';
});

$('clear').addEventListener('click', async () => {
  if (!words.length) return;
  if (!confirm(`¿Quitar las ${words.length} palabras de tu diccionario? Te recomendamos exportarlo antes.`)) return;
  words = await DICT.save([]);
  render();
  message('Diccionario vaciado.');
});

// ---------- Sincronización: pasos según el navegador ----------

function showBrowser(name) {
  for (const [tab, panel] of [['tabEdge', 'syncEdge'], ['tabChrome', 'syncChrome']]) {
    const on = tab === 'tab' + name;
    $(tab).setAttribute('aria-selected', on);
    $(panel).hidden = !on;
  }
}
const brands = (navigator.userAgentData && navigator.userAgentData.brands || []).map((b) => b.brand).join(' ');
showBrowser(/Edge/i.test(brands) || /Edg\//.test(navigator.userAgent) ? 'Edge' : 'Chrome');
$('tabEdge').addEventListener('click', () => showBrowser('Edge'));
$('tabChrome').addEventListener('click', () => showBrowser('Chrome'));

// Las páginas internas (edge://, chrome://) solo se pueden abrir desde la extensión
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', async () => {
  const url = b.dataset.open;
  try {
    await chrome.tabs.create({ url });
  } catch {
    $('openHint').hidden = false;
    $('openHint').textContent = `Tu navegador no permitió abrirla. Escribe en la barra de direcciones: ${url}`;
  }
}));

DICT.onChange((w) => { words = w; render(); }); // cambios desde otro PC o desde una página
DICT.load().then((w) => { words = w; render(); });
