param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    throw "Arquivo de backup nao encontrado: $BackupFile"
}

$backupName = Split-Path -Leaf $BackupFile
$backupPathInContainer = "/backups/$backupName"
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "asset_guardian" }
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "asset_guardian" }
$dbPassword = if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "asset_guardian" }

$result = docker compose exec -T -e PGPASSWORD=$dbPassword postgres pg_restore -U $dbUser -d $dbName --clean --if-exists $backupPathInContainer
if ($LASTEXITCODE -ne 0) {
    throw "Falha no restore: $result"
}

Write-Output "Restore concluido a partir de: $BackupFile"
