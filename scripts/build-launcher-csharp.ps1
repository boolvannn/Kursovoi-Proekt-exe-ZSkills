# Сборка C# лаунчера в один переносимый exe.
# Результат: dist/DiplomLauncher.exe (framework-dependent, требует .NET 9 Desktop Runtime)
# или dist/DiplomLauncher/ (self-contained, если указан -SelfContained).
param(
    [switch]$SelfContained
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Project = Join-Path $Root "launcher\DiplomLauncher\DiplomLauncher.csproj"
$DistDir = Join-Path $Root "dist"

if (-not (Test-Path $Project)) {
    throw "Не найден проект: $Project"
}

$publishDir = Join-Path $DistDir "DiplomLauncher"

Write-Host "Восстановление пакетов..."
dotnet restore $Project

$publishArgs = @(
    "publish", $Project,
    "-c", "Release",
    "-o", $publishDir,
    "--nologo"
)

if ($SelfContained) {
    Write-Host "Публикация self-contained (win-x64)..."
    $publishArgs += @("-r", "win-x64", "--self-contained", "true", "-p:PublishSingleFile=true", "-p:IncludeNativeLibrariesForSelfExtract=true")
} else {
    Write-Host "Публикация framework-dependent (требуется .NET 9 Desktop Runtime)..."
}

& dotnet @publishArgs

Write-Host ""
Write-Host "Готово. Лаунчер: $publishDir\DiplomLauncher.exe"
Write-Host "Для работы положите exe в корень проекта рядом с папкой 'apps'."
