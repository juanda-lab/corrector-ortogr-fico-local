# Descarga las dependencias que no se guardan en el repositorio:
#   java\          Java 21 (Eclipse Temurin, JRE portátil)
#   LanguageTool\  Servidor de LanguageTool (versión estable)
# Uso:  powershell -ExecutionPolicy Bypass -File preparar.ps1
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = 'Tls12'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-Portable($name, $url) {
  $dest = Join-Path $root $name
  if (Test-Path $dest) { Write-Host "$name ya existe, se omite."; return }
  $zip = Join-Path $env:TEMP "$name-descarga.zip"
  $tmp = Join-Path $env:TEMP "$name-descarga"
  Write-Host "Descargando $name..."
  Invoke-WebRequest $url -OutFile $zip
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip $tmp
  Move-Item (Get-ChildItem $tmp -Directory)[0].FullName $dest
  Remove-Item $zip, $tmp -Recurse -Force
}

Get-Portable 'java' 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse'
Get-Portable 'LanguageTool' 'https://languagetool.org/download/LanguageTool-stable.zip'
Write-Host 'Listo.'
