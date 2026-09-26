# Política de privacidad — Corrector Local

_Última actualización: 26 de septiembre de 2026_

Corrector Local (el programa para Windows y la extensión "Corrector Local" para Microsoft Edge y Google Chrome) está diseñado para **no recoger ningún dato**.

## Qué datos se procesan

- **Texto que escribes en campos de páginas web.** La extensión lo envía únicamente al servidor de corrección que se ejecuta **en tu propio PC** (`http://127.0.0.1:8081` / `http://localhost:8081`), que lo analiza y devuelve las sugerencias. Ese texto **nunca se envía a internet**, no se guarda en disco y se descarta después de cada revisión.
- **Ajustes.** Si activas o desactivas el corrector, cambias el idioma o lo desactivas en un sitio, se guarda en el almacenamiento local de la extensión en tu navegador (`chrome.storage.local`). No sale de tu PC.
- **Diccionario personal.** Las palabras que añades a «Mi diccionario» se guardan en `chrome.storage.sync`: si tienes la sincronización del navegador activada, tu navegador las sincroniza entre tus PCs a través de tu cuenta de Microsoft o Google (igual que tus favoritos). Solo se sincronizan esas palabras, nunca el texto que escribes. El autor no tiene acceso a ellas.

## Conexiones a internet

- **Comprobación de actualizaciones:** al abrir la ventana de la extensión (icono DD), esta puede consultar la API pública de GitHub para saber si hay una versión nueva. Esa consulta **no incluye ningún texto tuyo** ni datos personales; GitHub solo recibe la petición habitual de cualquier navegador (dirección IP, navegador).
- **Reportar un error o una sugerencia equivocada:** solo si tú lo pides (botón «Reportar» o clic derecho), la extensión abre en GitHub un aviso ya rellenado con la frase afectada. **Nada se envía hasta que tú lo revisas y pulsas enviar en GitHub**, y ese aviso es público: quita cualquier dato personal antes de enviarlo.
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
| `storage` | Guardar tus ajustes y los sitios donde desactivaste el corrector (en el navegador), y tu diccionario personal (sincronizado por el navegador con tu cuenta, si lo tienes activado). |
| `contextMenus` | Mostrar «Añadir a Mi diccionario» y «Reportar» al hacer clic derecho sobre un texto seleccionado. |
| `alarms` | Comprobar una vez por minuto si el corrector de tu PC responde, para mostrar el aviso en el icono. No envía nada a internet. |
| `activeTab` | Saber en qué sitio estás cuando abres la ventana de la extensión, para el interruptor "Revisar en este sitio". Solo se usa en ese momento y no se guarda el historial. |

## Contacto

Para dudas o problemas, abre un _issue_ en el repositorio del proyecto:
https://github.com/juanda-lab/corrector-ortogr-fico-local/issues

Si esta política cambia, se actualizará este documento y la fecha de arriba.
