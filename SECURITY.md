# Seguridad

## Cómo reportar un problema

Si encuentras una vulnerabilidad, **no abras un _issue_ público**. Usa la opción
**"Report a vulnerability"** de la pestaña **Security** del repositorio en GitHub
(aviso privado). Incluye los pasos para reproducirlo y la versión afectada.

Se intentará responder en un plazo de 7 días.

## Versiones con soporte

Solo recibe correcciones la última versión publicada en **Releases**.

## Diseño de seguridad

- El servidor de corrección escucha **solo en `127.0.0.1`**: no es accesible desde otros equipos de la red.
- El servidor **no envía cabeceras CORS**, así que las páginas web no pueden usarlo; solo la extensión, que se comunica con él desde su proceso interno con permiso explícito para `localhost`.
- La extensión no lee campos de contraseña y no envía texto a internet (ver [PRIVACY.md](PRIVACY.md)).
- El instalador no requiere permisos de administrador y solo escribe en la carpeta elegida, en el inicio automático del usuario, en su menú Inicio y en la clave `HKCU\...\Uninstall\CorrectorLocal`.
- Java y LanguageTool se incluyen sin modificar desde sus fuentes oficiales (ver [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt)). Para recibir sus parches de seguridad, instala la versión más reciente de Corrector Local.
