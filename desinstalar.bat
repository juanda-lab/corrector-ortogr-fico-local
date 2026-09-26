@echo off
rem Desinstala Corrector Local: detiene el servidor, quita el arranque automatico,
rem la entrada de "Aplicaciones instaladas" y borra esta carpeta.

echo Desinstalando Corrector Local...
call "%~dp0detener-servidor.bat" >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LanguageTool local.vbs" 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\CorrectorLocal" /f >nul 2>&1
rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Corrector Local" 2>nul

echo.
echo Listo. Recuerda quitar la extension "Corrector Local" en edge://extensions
echo.
pause

rem Borra la carpeta solo si es la de Corrector Local (tiene java y LanguageTool dentro)
if exist "%~dp0java\bin\java.exe" if exist "%~dp0LanguageTool\languagetool-server.jar" (
  start "" /min cmd /c "timeout /t 2 /nobreak >nul & rd /s /q "%~dp0""
)
