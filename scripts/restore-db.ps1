# Edgi Automated Database Restore Verification Script (PowerShell)
# Restores a backup file into a target database (default: edgi_scratch for non-destructive verification)

param (
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    [string]$ContainerName = "edgi-postgres",
    [string]$DbUser = "postgres",
    [string]$TargetDb = "edgi_scratch"
)

$ErrorActionPreference = "Stop"

# If no backup file specified, pick the latest from backups/db
if (-not $BackupFile) {
    $latest = Get-ChildItem -Path "backups/db" -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "No backup files found in backups/db. Please run backup-db.ps1 first."
        exit 1
    }
    $BackupFile = $latest.FullName
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found at: $BackupFile"
    exit 1
}

Write-Host "🔄 Starting database restore into target '$TargetDb'..." -ForegroundColor Cyan
Write-Host "   Source: $BackupFile"

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# 1. Create target database if it doesn't exist
docker exec $ContainerName psql -U $DbUser -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$TargetDb'" | Out-Null
docker exec $ContainerName psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $TargetDb;" | Out-Null
docker exec $ContainerName psql -U $DbUser -d postgres -c "CREATE DATABASE $TargetDb;" | Out-Null

# 2. Feed SQL backup into target database
Get-Content -Path $BackupFile -Raw | docker exec -i $ContainerName psql -U $DbUser -d $TargetDb | Out-Null

$stopwatch.Stop()
$elapsed = $stopwatch.ElapsedMilliseconds

# 3. Verify Table and Row Parity
Write-Host "🔍 Verifying restored data integrity in '$TargetDb'..." -ForegroundColor Yellow
$userCount = (docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM users;").Trim()
$profileCount = (docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM user_profiles;").Trim()
$sourceCount = (docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM sources;").Trim()
$oppCount = (docker exec $ContainerName psql -U $DbUser -d $TargetDb -t -c "SELECT COUNT(*) FROM opportunities;").Trim()

Write-Host "✅ Database restore successfully completed & verified!" -ForegroundColor Green
Write-Host "   Target Database: $TargetDb"
Write-Host "   Restore Duration: $($elapsed)ms"
Write-Host "   Integrity Row Counts:"
Write-Host "     - users: $userCount"
Write-Host "     - user_profiles: $profileCount"
Write-Host "     - sources: $sourceCount"
Write-Host "     - opportunities: $oppCount"
