# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).

## [1.3.0] - 2026-09-26

### Añadido
- Atajo **Alt+Enter**: corrige con la primera sugerencia el error junto al cursor, sin usar el ratón.
- **Revisar en este sitio**: interruptor en la ventana de la extensión para desactivarla solo en una página concreta.
- Instalación más sencilla: la página de bienvenida y la ventana de la extensión descargan el instalador directamente, y la pantalla final del instalador abre la extensión en la tienda de Edge (la instalación manual queda como opción avanzada).
- **Reglas propias para errores frecuentes al escribir rápido** (carpeta `reglas/`): cando → cuando, asta → hasta, abia → había, valla → vaya, ase → hace, aser/acer → hacer, ise → hice, iso → hizo, nose → no sé, talves → tal vez, hechar → echar, deveras → de veras, haci → así, «e echo» → «he hecho» y «e» suelta.
- Compilación automática y publicación de versiones con GitHub Actions.

### Cambiado
- Instalador mucho más pequeño: LanguageTool solo incluye español, inglés y portugués (y catalán, que usa el detector de idioma).
- Nuevo permiso `activeTab`, solo para saber en qué sitio estás al abrir la ventana de la extensión.

## [1.2.0] - 2026-09-25

### Añadido
- Página de bienvenida al instalar la extensión (por ejemplo desde la tienda): explica cómo descargar el corrector para Windows desde GitHub y detecta sola cuándo está funcionando.
- Si el corrector no está instalado o está apagado, la ventana de la extensión muestra el enlace de descarga y la guía de instalación.

## [1.1.0] - 2026-09-25

### Añadido
- Página de licencia en el instalador (hay que aceptarla para continuar).
- Accesos en el menú Inicio: carpeta, LEEME, licencias y desinstalar.
- Aviso de versión nueva en la ventana de la extensión (consulta GitHub Releases).
- Política de privacidad (`PRIVACY.md`), avisos de terceros (`THIRD-PARTY-NOTICES.txt`) y política de seguridad (`SECURITY.md`).

### Cambiado
- El servidor ya no acepta peticiones de páginas web (se quitó `--allow-origin`). Solo la extensión Corrector Local puede usarlo.
  **La extensión oficial de LanguageTool deja de funcionar con este servidor.**

## [1.0.1] - 2026-09-25

### Corregido
- Google Sheets y otros editores que tienen el foco antes de cargar la extensión o que cambian el texto sin lanzar eventos `input`.
- Ya no se revisan las fórmulas de hojas de cálculo (texto que empieza por `=`).

## [1.0.0] - 2026-09-25

### Añadido
- Primera versión: servidor local de LanguageTool, extensión para Edge/Chrome con subrayado y sugerencias, diccionario personal e instalador `.exe`.
