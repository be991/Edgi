# Edgi Automated Database Backup Script (PowerShell)
# Target: PostgreSQL 16 container (edgi-postgres) or host localhost:5433

param (
    [string]$ContainerName = "edgi-postgres",
    [string]$DbUser = "postgres",
    [string]$DbName = "edgi",
    [string]$BackupDir = "backups/db"
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$backupFile = Join-Path $BackupDir "edgi_backup_$timestamp.sql"
Write-Host "📦 Starting automated database backup for '$DbName'..." -ForegroundColor Cyan

$startTime = [System.Diagnostics.Stopwatch]::StartNew()

# Execute pg_dump inside docker container
docker exec $ContainerName pg_dump -U $DbUser --clean --if-exists $DbName | Out-File -FilePath $backupFile -Encoding utf8

$startTime.Stop()
$elapsed = $startTime.ElapsedMilliseconds
$fileSize = (Get-Item $backupFile).Length

Write-Host "✅ Database backup created successfully!" -ForegroundColor Green
Write-Host "   File: $backupFile"
Write-Host "   Size: $([math]::Round($fileSize / 1KB, 2)) KB"
Write-Host "   Time: $($elapsed)ms"
Write-Host "   Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
