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

# Deja en LanguageTool solo los idiomas que ofrece la extensión (español, inglés y
# portugués; el catalán lo exige el detector automático de idioma). Reduce el instalador a la mitad. LanguageTool solo carga los idiomas
# listados en language-module.properties, así que el resto se puede borrar.
function Reduce-LanguageTool {
  $lt = Join-Path $root 'LanguageTool'
  $marca = Join-Path $lt '.recortado'
  if (Test-Path $marca) { return }
  Write-Host 'Quitando idiomas que no se usan de LanguageTool...'
  $conservar = @('es', 'en', 'pt', 'ca')
  $clases = @('Spanish', 'English', 'Portuguese', 'Catalan')

  $props = Join-Path $lt 'META-INF\org\languagetool\language-module.properties'
  # Cada línea "languageClasses=org.languagetool.language.<Idioma>,..." registra un idioma
  $lineas = Get-Content $props | Where-Object {
    if ($_ -notmatch '^languageClasses=org\.languagetool\.language\.(\w+)') { return $true }
    return $clases -contains $Matches[1]
  }
  [IO.File]::WriteAllLines($props, [string[]]$lineas)

  foreach ($sub in 'rules', 'resource') {
    Get-ChildItem (Join-Path $lt "org\languagetool\$sub") -Directory |
      Where-Object { $conservar -notcontains $_.Name } |
      Remove-Item -Recurse -Force
  }

  # Diccionarios y librerías exclusivos de otros idiomas
  $jars = 'asturian-pos-dict', 'dutch-pos-dict', 'french-pos-dict', 'german-pos-dict',
          'languagetool-ga-dicts', 'lucene-gosen-ipadic', 'hanlp', 'morfologik-crh-lt', 'morfologik-ukrainian-lt', 'morphology-el'
  foreach ($j in $jars) { Remove-Item (Join-Path $lt "libs\$j.jar") -Force -ErrorAction SilentlyContinue }

  Set-Content $marca "Idiomas conservados: $($conservar -join ', ')"
}

Get-Portable 'java' 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse'
Get-Portable 'LanguageTool' 'https://languagetool.org/download/LanguageTool-stable.zip'
Reduce-LanguageTool
Write-Host 'Listo.'
