# Construye "Instalador Corrector Local.exe" (con todo el proyecto dentro) y el
# paquete de la extensión para las tiendas "Corrector Local <versión> - extension.zip".
# Uso:  powershell -ExecutionPolicy Bypass -File construir.ps1 [-Salida <carpeta>]
# Por defecto los deja en la carpeta que contiene el proyecto.
param([string]$Salida)
$ErrorActionPreference = 'Stop'
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj  = Split-Path -Parent $here
$build = Join-Path $here 'build'
if (-not $Salida) { $Salida = Split-Path -Parent $proj }
New-Item -ItemType Directory -Force $Salida | Out-Null
$out   = Join-Path $Salida 'Instalador Corrector Local.exe'
$csc   = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

# Comprueba que la versión es la misma en la extensión y en el instalador
$version = (Get-Content (Join-Path $proj 'extension\manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$csVersion = [regex]::Match((Get-Content (Join-Path $here 'Instalador.cs') -Raw), 'const string Version = "([^"]+)"').Groups[1].Value
if ($version -ne $csVersion) { throw "Versiones distintas: manifest.json=$version, Instalador.cs=$csVersion" }
Write-Host "Version $version"

New-Item -ItemType Directory -Force $build | Out-Null

# Crea un .zip con rutas "/" (las tiendas y los navegadores no aceptan "\")
function New-Zip($zipPath, $root, $excluir) {
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Confirm:$false }
  $zip = [IO.Compression.ZipFile]::Open($zipPath, 'Create')
  try {
    Get-ChildItem $root -Recurse -File -Force | ForEach-Object {
      $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
      if ($excluir -contains $rel.Split('/')[0]) { return }
      [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal') | Out-Null
    }
  } finally { $zip.Dispose() }
}

# 0. Dependencias (Java y LanguageTool) y reglas propias. Solo descarga lo que falta.
& (Join-Path $proj 'preparar.ps1')

# 0b. COMPONENTES.txt: versiones exactas de terceros y enlaces a su código fuente (LGPL/GPL)
$javaRelease = Get-Content (Join-Path $proj 'java\release') | ConvertFrom-StringData
$javaVersion = $javaRelease.JAVA_VERSION.Trim('"')
$javaSource  = $javaRelease.SOURCE.Trim('"')
$ltLine = & (Join-Path $proj 'java\bin\java.exe') -jar (Join-Path $proj 'LanguageTool\languagetool-commandline.jar') --version 2>$null | Select-Object -First 1
$ltVersion = [regex]::Match("$ltLine", 'version ([\d.]+)').Groups[1].Value
if (-not $ltVersion) { throw "No se pudo leer la versión de LanguageTool: $ltLine" }
$componentes = @"
COMPONENTES DE TERCEROS INCLUIDOS - Corrector Local $version
Generado al compilar el $(Get-Date -Format 'yyyy-MM-dd').

LanguageTool $ltVersion  (LGPL-2.1+, con las modificaciones descritas en THIRD-PARTY-NOTICES.txt)
  Detalle:        $ltLine
  Codigo fuente:  https://github.com/languagetool-org/languagetool/tree/v$ltVersion
  Descarga:       https://languagetool.org/download/

Eclipse Temurin JRE $javaVersion  (GPL-2.0 WITH Classpath-exception-2.0, sin cambios)
  Origen:         $javaSource
  Codigo fuente:  https://github.com/adoptium/jdk21u
  Descarga:       https://adoptium.net/temurin/releases/?version=21
"@
[IO.File]::WriteAllText((Join-Path $proj 'COMPONENTES.txt'), $componentes.Replace("`r`n", "`n").Replace("`n", "`r`n"), (New-Object Text.UTF8Encoding $false))
Write-Host "Componentes: LanguageTool $ltVersion, Java $javaVersion"

# 1. Paquete con lo que se instala (sin instalador, repositorio ni documentación)
Write-Host 'Empaquetando archivos...'
$payload = Join-Path $build 'payload.zip'
New-Zip $payload $proj @('instalador', 'docs', 'reglas', '.git', '.github', '.gitignore', '.gitattributes', 'README.md', 'preparar.ps1', 'CHANGELOG.md', 'SECURITY.md', 'PRIVACY.md', 'DESINSTALAR.md')

# 2. Texto de la página "Licencia y privacidad" del instalador
$privacidad = @'
PRIVACIDAD
==========
Corrector Local no recoge ningun dato. El texto que escribes solo se envia al
servidor de correccion que se ejecuta en este PC (127.0.0.1) y nunca sale a
internet. No hay cuentas, analiticas ni publicidad. La extension solo consulta
GitHub para avisar de versiones nuevas, sin enviar nada de lo que escribes.
Politica completa:
https://github.com/juanda-lab/corrector-ortogr-fico-local/blob/main/PRIVACY.md
'@
$sep = "`r`n`r`n" + ('-' * 72) + "`r`n`r`n"
$licencia = (Get-Content (Join-Path $proj 'LICENSE') -Raw) + $sep + $privacidad + $sep + (Get-Content (Join-Path $proj 'THIRD-PARTY-NOTICES.txt') -Raw)
[IO.File]::WriteAllText((Join-Path $build 'licencia.txt'), $licencia, (New-Object Text.UTF8Encoding $false))

# 3. Compilar (logo.png de esta carpeta va en la cabecera del instalador)
Write-Host 'Compilando...'
& $csc /nologo /target:winexe /optimize+ /codepage:65001 `
  "/out:$out" "/win32icon:$(Join-Path $proj 'logo.ico')" `
  /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll `
  "/resource:$payload,payload.zip" "/resource:$(Join-Path $here 'logo.png'),logo.png" "/resource:$(Join-Path $build 'licencia.txt'),licencia.txt" `
  (Join-Path $here 'Instalador.cs')
if ($LASTEXITCODE -ne 0) { throw 'Error al compilar' }

# 4. Paquete de la extensión para Edge Add-ons / Chrome Web Store
$extZip = Join-Path $Salida "Corrector Local $version - extension.zip"
New-Zip $extZip (Join-Path $proj 'extension') @()

Remove-Item $build -Recurse -Force -Confirm:$false
Write-Host ("Listo: {0}  ({1} MB)" -f $out, [math]::Round((Get-Item $out).Length / 1MB, 1))
Write-Host ("Listo: {0}  ({1} KB)" -f $extZip, [math]::Round((Get-Item -LiteralPath $extZip).Length / 1KB))
