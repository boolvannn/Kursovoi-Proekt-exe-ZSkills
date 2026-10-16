$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LauncherDir = Join-Path $Root "launcher"
$DistDir = Join-Path $Root "dist"
$LauncherSource = Join-Path $LauncherDir "launcher.py"

Set-Location $Root

# customtkinter тянет свои JSON/шрифты/темы — их обязательно нужно собрать.
py -3 -m PyInstaller --clean --noconsole --onefile `
  --name DiplomLauncher `
  --distpath $DistDir `
  --paths $LauncherDir `
  --collect-all customtkinter `
  --hidden-import launcher_core `
  --hidden-import launcher_ui `
  $LauncherSource

Write-Host "Launcher exe: $(Join-Path $DistDir 'DiplomLauncher.exe')"
