// Enlaces del proyecto, compartidos por la ventana de la extensión, la página de bienvenida
// y la parte de fondo (background.js).
const REPO = 'juanda-lab/corrector-ortogr-fico-local';
const LINKS = {
  repo: `https://github.com/${REPO}`,
  download: `https://github.com/${REPO}/releases/latest`,
  // Descarga directa del instalador de la última versión (nombre fijo en cada Release)
  installer: `https://github.com/${REPO}/releases/latest/download/Instalador-Corrector-Local.exe`,
  privacy: `https://github.com/${REPO}/blob/main/PRIVACY.md`,
  releasesApi: `https://api.github.com/repos/${REPO}/releases/latest`,
};

// Abre un aviso (issue) nuevo en GitHub ya rellenado. El usuario lo revisa y decide si lo envía:
// la extensión no envía nada por su cuenta.
function reportUrl({ title, body }) {
  const params = new URLSearchParams({ title, body });
  return `https://github.com/${REPO}/issues/new?${params}`;
}

function reportBody({ tipo, frase = '', palabra = '', sugerencia = '', regla = '', version = '' }) {
  const recorte = (t) => String(t || '').trim().slice(0, 500);
  const aviso = '> ⚠️ Este aviso será **público**. Revisa la frase y quita nombres, teléfonos o cualquier dato personal antes de enviarlo.';
  if (tipo === 'no-detectado') {
    return [
      aviso, '',
      '### Frase donde no se detectó el error', '```', recorte(frase) || '(escribe aquí la frase)', '```', '',
      '### Palabra que debió marcarse', '(escríbela aquí)', '',
      '### Corrección correcta', '(escríbela aquí)', '',
      `_Corrector Local ${version}_`,
    ].join('\n');
  }
  return [
    aviso, '',
    '### Frase', '```', recorte(frase), '```', '',
    `### Lo que marcó el corrector`, `- Palabra: \`${recorte(palabra)}\``, `- Sugerencia: \`${recorte(sugerencia) || '(ninguna)'}\``, `- Regla: \`${regla}\``, '',
    '### ¿Por qué está mal la sugerencia?', '(explícalo aquí)', '',
    `_Corrector Local ${version}_`,
  ].join('\n');
}
