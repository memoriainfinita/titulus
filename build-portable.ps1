# build-portable.ps1 — standalone static build that runs at root on any PC.
# Produces credits-portable/ and credits-portable.zip (no basePath).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "[1/3] Building portable static export (PORTABLE=true, no basePath)..." -ForegroundColor Cyan
$env:PORTABLE = "true"
pnpm build
if ($LASTEXITCODE -ne 0) { throw "build failed" }

Write-Host "[2/3] Packaging out/ + run guide..." -ForegroundColor Cyan
$dist = Join-Path $PSScriptRoot "credits-portable"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item -Recurse (Join-Path $PSScriptRoot "out\*") $dist

$readme = @"
Credit Titles Studio - portable build

Run on any PC with a browser (Chrome/Edge recommended):

  Option A (Node):    npx serve .
  Option B (Python):  python -m http.server 8000

Then open the URL it prints (e.g. http://localhost:8000/).

Notes:
- 100% static, no install needed beyond a static server.
- Opening index.html directly (file://) does NOT work; use a server.
- Video export needs internet (FFmpeg from unpkg); the editor works offline.
- Project/video state is saved in that browser's localStorage.
"@
Set-Content -Path (Join-Path $dist "HOW-TO-RUN.txt") -Value $readme -Encoding UTF8

Write-Host "[3/3] Zipping..." -ForegroundColor Cyan
$zip = Join-Path $PSScriptRoot "credits-portable.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zip

Write-Host "Done -> $zip" -ForegroundColor Green
Write-Host "       (also unpacked at $dist)" -ForegroundColor Green
