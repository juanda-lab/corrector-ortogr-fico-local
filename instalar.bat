@echo off
rem Configura el servidor local de LanguageTool para que arranque con Windows y lo inicia.
rem No necesita permisos de administrador.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "DEST=%STARTUP%\LanguageTool local.vbs"

(
  echo ' Arranca el servidor local de LanguageTool sin mostrar ventana
  echo CreateObject^("WScript.Shell"^).Run Chr^(34^) ^& "%~dp0iniciar-servidor.bat" ^& Chr^(34^), 0, False
) > "%DEST%"

wscript.exe "%DEST%"

echo.
echo Listo. El servidor arrancara solo cada vez que prendas el PC.
echo Espera unos 20 segundos y abre en el navegador:
echo     http://localhost:8081/v2/languages
echo Si ves una lista de idiomas, esta funcionando.
echo.
echo Si mueves esta carpeta a otro lugar, vuelve a ejecutar instalar.bat.
echo.
pause
