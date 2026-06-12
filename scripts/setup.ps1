# First-run setup (Windows): create .env from the template with freshly
# generated secrets. Safe to re-run — refuses to overwrite an existing .env.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = 'Stop'

Set-Location (Join-Path $PSScriptRoot '..')

if (Test-Path .env) {
    Write-Host ".env already exists — leaving it untouched."
    exit 0
}

function New-RandomHex([int]$bytes) {
    $buf = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
    ($buf | ForEach-Object { $_.ToString('x2') }) -join ''
}

$accessSecret  = New-RandomHex 48
$refreshSecret = New-RandomHex 48
$dbPassword    = New-RandomHex 24

$content = Get-Content .env.example -Raw
$content = $content -replace '(?m)^JWT_ACCESS_SECRET=.*',  "JWT_ACCESS_SECRET=$accessSecret"
$content = $content -replace '(?m)^JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$refreshSecret"
$content = $content -replace '(?m)^POSTGRES_PASSWORD=.*',  "POSTGRES_PASSWORD=$dbPassword"
$content = $content -replace '(?m)^DATABASE_URL=.*',       "DATABASE_URL=postgresql://sprintai:$dbPassword@postgres:5432/sprintai?schema=public"

# UTF-8 without BOM — docker compose env_file chokes on a BOM.
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $content)

Write-Host "Wrote .env with generated JWT secrets and DB password."
Write-Host "Next:  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
