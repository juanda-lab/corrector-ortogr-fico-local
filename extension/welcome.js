document.getElementById('download').href = LINKS.download;
document.getElementById('privacy').href = LINKS.privacy;
document.getElementById('repo').href = LINKS.repo;

const status = document.getElementById('status');
const statusText = document.getElementById('statusText');
const statusHint = document.getElementById('statusHint');
let timer = null;

async function check() {
  let ok = false;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'ping' });
    ok = !!(res && res.ok);
  } catch { /* servidor no disponible */ }

  if (ok) {
    status.classList.add('ok');
    statusText.textContent = '¡Listo! El corrector está funcionando.';
    statusHint.textContent = 'Recarga las páginas que tengas abiertas y empieza a escribir: los errores se subrayarán.';
    clearInterval(timer);
  } else {
    statusText.textContent = 'Todavía no se detecta el corrector en tu PC.';
    statusHint.textContent = 'Si ya lo instalaste, espera unos segundos: tarda un poco en arrancar.';
  }
}

check();
timer = setInterval(check, 3000);
