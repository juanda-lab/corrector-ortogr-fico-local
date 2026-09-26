# Política de firma de código / Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).
_(Firma de código gratuita proporcionada por SignPath.io, certificado de SignPath Foundation.)_

## Qué se firma

Solo los archivos que se compilan en **GitHub Actions** a partir del código de este repositorio
([`.github/workflows/compilar.yml`](.github/workflows/compilar.yml)) y se publican en
[Releases](https://github.com/juanda-lab/corrector-ortogr-fico-local/releases):

- `Instalador-Corrector-Local.exe`: instalador de Corrector Local para Windows.

Nunca se firman archivos compilados en un PC personal ni programas de terceros por separado.
El instalador incluye, sin modificar su código, LanguageTool (LGPL-2.1) y Eclipse Temurin (GPL-2.0 con Classpath Exception);
ver [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

## Equipo y roles

| Rol | Persona |
|---|---|
| Autor (committer) | [Daniel Diaz (@juanda-lab)](https://github.com/juanda-lab) |
| Revisor (reviewer) | [Daniel Diaz (@juanda-lab)](https://github.com/juanda-lab) |
| Aprobador (approver) | [Daniel Diaz (@juanda-lab)](https://github.com/juanda-lab) |

Todos los miembros usan autenticación en dos pasos (MFA) en GitHub y en SignPath.
Cada versión firmada se aprueba manualmente antes de publicarse.

## Privacidad

Este programa no envía información a ningún servidor sin que el usuario lo pida.
El texto que se revisa se procesa solo en el propio PC. La extensión consulta la API pública de GitHub
para avisar de versiones nuevas. Ver la [política de privacidad](PRIVACY.md).

## Cambios en el sistema

El instalador informa, antes de instalar, de todo lo que hace: copiar archivos en la carpeta elegida,
arranque automático con Windows, accesos en el menú Inicio y entrada en «Aplicaciones instaladas».
Se desinstala por completo desde **Configuración → Aplicaciones → Corrector Local → Desinstalar**.

## Reportar un problema

Si crees que un archivo firmado no respeta esta política, repórtalo de forma privada
(ver [SECURITY.md](SECURITY.md)) o abre un [issue](https://github.com/juanda-lab/corrector-ortogr-fico-local/issues).
