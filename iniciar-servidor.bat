@echo off
rem Servidor de Corrector Local (LanguageTool) solo en este PC: 127.0.0.1:8081.
rem Sin --allow-origin: las paginas web no pueden usarlo; solo la extension Corrector Local.
cd /d "%~dp0LanguageTool"
"%~dp0java\bin\java.exe" -Xmx2g -cp languagetool-server.jar org.languagetool.server.HTTPServer --config "%~dp0server.properties" --port 8081
