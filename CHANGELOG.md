# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).

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
