# Construye "Instalador Corrector Local.exe" con todo el proyecto dentro.
# Uso:  powershell -ExecutionPolicy Bypass -File construir.ps1
$ErrorActionPreference = 'Stop'
$here  = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj  = Split-Path -Parent $here
$build = Join-Path $here 'build'
$out   = Join-Path (Split-Path -Parent $proj) 'Instalador Corrector Local.exe'
$csc   = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

New-Item -ItemType Directory -Force $build | Out-Null

# 0. Dependencias (Java y LanguageTool) si faltan
if (-not (Test-Path (Join-Path $proj 'java')) -or -not (Test-Path (Join-Path $proj 'LanguageTool'))) {
  & (Join-Path $proj 'preparar.ps1')
}

# 1. Paquete con lo que se instala (sin instalador, repositorio ni documentación)
$excluir = @('instalador', 'docs', '.git', '.gitignore', 'README.md', 'preparar.ps1', 'CHANGELOG.md', 'SECURITY.md', 'PRIVACY.md')
Write-Host 'Empaquetando archivos...'
$payload = Join-Path $build 'payload.zip'
if (Test-Path $payload) { Remove-Item $payload -Confirm:$false }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($payload, 'Create')
try {
  Get-ChildItem $proj -Recurse -File -Force | ForEach-Object {
    $rel = $_.FullName.Substring($proj.Length + 1).Replace('\', '/')
    if ($excluir -contains $rel.Split('/')[0]) { return }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal') | Out-Null
  }
} finally { $zip.Dispose() }

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

Remove-Item $build -Recurse -Force -Confirm:$false
Write-Host ("Listo: {0}  ({1} MB)" -f $out, [math]::Round((Get-Item $out).Length / 1MB, 1))
