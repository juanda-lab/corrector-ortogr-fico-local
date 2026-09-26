# Política de privacidad — Corrector Local

_Última actualización: 25 de septiembre de 2026_

Corrector Local (el programa para Windows y la extensión "Corrector Local" para Microsoft Edge y Google Chrome) está diseñado para **no recoger ningún dato**.

## Qué datos se procesan

- **Texto que escribes en campos de páginas web.** La extensión lo envía únicamente al servidor de corrección que se ejecuta **en tu propio PC** (`http://127.0.0.1:8081` / `http://localhost:8081`), que lo analiza y devuelve las sugerencias. Ese texto **nunca se envía a internet**, no se guarda en disco y se descarta después de cada revisión.
- **Ajustes y diccionario personal.** Si activas o desactivas el corrector, cambias el idioma o añades palabras al diccionario, se guardan en el almacenamiento local de la extensión en tu navegador (`chrome.storage.local`). No se sincronizan ni se envían a ningún sitio.

## Conexiones a internet

- **Comprobación de actualizaciones:** al abrir la ventana de la extensión (icono DD), esta puede consultar la API pública de GitHub para saber si hay una versión nueva. Esa consulta **no incluye ningún texto tuyo** ni datos personales; GitHub solo recibe la petición habitual de cualquier navegador (dirección IP, navegador).
- No hay analíticas, publicidad, rastreadores, cuentas de usuario ni servidores propios del autor.

## Qué NO hace

- No lee campos de contraseña.
- No accede a tu historial, marcadores, cookies ni pestañas.
- No vende, comparte ni transfiere datos a terceros, porque no los recoge.

## Permisos de la extensión y para qué se usan

| Permiso | Uso |
|---|---|
| Acceso a las páginas que visitas (`<all_urls>`) | Detectar los campos de texto donde escribes y subrayar los errores. |
| `http://localhost/*`, `http://127.0.0.1/*` | Comunicarse con el servidor de corrección de tu PC. |
| `storage` | Guardar tus ajustes y tu diccionario personal en el navegador. |

## Contacto

Para dudas o problemas, abre un _issue_ en el repositorio del proyecto:
https://github.com/juanda-lab/corrector-ortogr-fico-local/issues

Si esta política cambia, se actualizará este documento y la fecha de arriba.
