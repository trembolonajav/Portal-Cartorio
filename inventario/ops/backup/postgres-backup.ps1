$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $projectRoot "backups"
$backupFile = "asset_guardian_$timestamp.dump"
$backupPathInContainer = "/backups/$backupFile"
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "asset_guardian" }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "asset_guardian" }
$dbPassword = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "asset_guardian" }

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$result = docker compose exec -T -e PGPASSWORD=$dbPassword postgres pg_dump -U $dbUser -d $dbName -F c -f $backupPathInContainer
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao gerar backup: $result"
}

Write-Output "Backup criado em: $backupDir\$backupFile"
