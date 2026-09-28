# Crea el paquete MSIX de Corrector Local para la Microsoft Store.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File empaquetar.ps1            -> crea "Corrector Local <versión>.msix"
#   powershell -ExecutionPolicy Bypass -File empaquetar.ps1 -Probar    -> lo instala en este PC sin firmar
#                                                                        (requiere el modo desarrollador de Windows)
#
# -Nombre y -Editor deben ser los que asigna Partner Center al reservar la app
# (Product management → Product identity: "Package/Identity/Name" y "Package/Identity/Publisher").
# La Microsoft Store firma el paquete al publicarlo: no hace falta certificado propio.
param(
  [string]$Nombre = 'DanielDiazDD.CorrectorLocal',
  [string]$Editor = 'CN=D1C43B80-E1C2-4451-9BE8-86FB672173B4',   # Partner Center → Identidad del producto
  [string]$EditorVisible = 'Daniel Diaz DD',
  [string]$Salida,
  [switch]$Probar
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$proj = Split-Path -Parent $here
if (-not $Salida) { $Salida = Split-Path -Parent $proj }
$stage = Join-Path $here 'build\paquete'
$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$sdk = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Directory |
       Where-Object { Test-Path (Join-Path $_.FullName 'x64\makeappx.exe') } | Sort-Object Name -Descending | Select-Object -First 1
if (-not $sdk) { throw 'No se encontró makeappx.exe (instala el Windows SDK)' }
$makeappx = Join-Path $sdk.FullName 'x64\makeappx.exe'

# Versión: la de la extensión, en formato de 4 números con el último en 0 (lo exige la Store)
$version = (Get-Content (Join-Path $proj 'extension\manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$version4 = "$version.0"
Write-Host "Corrector Local $version4 ($Nombre)"

# 1. Dependencias (Java, LanguageTool recortado y reglas propias)
& (Join-Path $proj 'preparar.ps1')

# 2. Carpeta del paquete
if (Test-Path $stage) {
  # Si el paquete de prueba está instalado desde esta carpeta, hay que quitarlo antes de reconstruirla
  Get-AppxPackage -Name $Nombre -ErrorAction SilentlyContinue | Where-Object InstallLocation -eq $stage | Remove-AppxPackage
  Remove-Item $stage -Recurse -Force
}
New-Item -ItemType Directory -Force $stage | Out-Null
Write-Host 'Copiando archivos...'
Copy-Item (Join-Path $proj 'java') $stage -Recurse
Copy-Item (Join-Path $proj 'LanguageTool') $stage -Recurse
Copy-Item (Join-Path $here 'assets') $stage -Recurse
foreach ($f in 'server.properties', 'LICENSE', 'THIRD-PARTY-NOTICES.txt', 'COMPONENTES.txt') {
  $p = Join-Path $proj $f
  if (Test-Path $p) { Copy-Item $p $stage }
}

# 3. Lanzador
Write-Host 'Compilando el lanzador...'
& $csc /nologo /target:winexe /optimize+ /codepage:65001 `
  "/out:$(Join-Path $stage 'CorrectorLocal.exe')" "/win32icon:$(Join-Path $proj 'logo.ico')" `
  /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll `
  (Join-Path $here 'Lanzador.cs')
if ($LASTEXITCODE -ne 0) { throw 'Error al compilar el lanzador' }

# 4. Manifiesto
$m = [IO.File]::ReadAllText((Join-Path $here 'AppxManifest.plantilla.xml'))
$m = $m.Replace('{{NOMBRE}}', $Nombre).Replace('{{EDITOR_VISIBLE}}', $EditorVisible).Replace('{{EDITOR}}', $Editor).Replace('{{VERSION}}', $version4)
[IO.File]::WriteAllText((Join-Path $stage 'AppxManifest.xml'), $m, (New-Object Text.UTF8Encoding $false))

if ($Probar) {
  # 5a. Instalación de prueba (sin firmar, modo desarrollador)
  Write-Host 'Instalando el paquete de prueba...'
  Add-AppxPackage -Register (Join-Path $stage 'AppxManifest.xml')
  $pkg = Get-AppxPackage -Name $Nombre
  Write-Host "Instalado: $($pkg.PackageFullName)"
  Write-Host "Para abrirlo:  explorer.exe shell:AppsFolder\$($pkg.PackageFamilyName)!CorrectorLocal"
  Write-Host "Para quitarlo: Get-AppxPackage -Name $Nombre | Remove-AppxPackage"
} else {
  # 5b. Paquete .msix para subir a Partner Center
  $msix = Join-Path $Salida "Corrector Local $version.msix"
  Write-Host 'Creando el paquete MSIX...'
  & $makeappx pack /o /d $stage /p $msix | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'makeappx falló' }
  Write-Host ("Listo: {0}  ({1:N1} MB)" -f $msix, ((Get-Item $msix).Length / 1MB))
}
