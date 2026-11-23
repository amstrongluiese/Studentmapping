# Automated Local MySQL Backup Script (Windows PowerShell)
# Usage: .\scripts\backup_mysql.ps1 [-BackupDir ".\backups"] [-RetentionDays 14]
# Reads MYSQL_URL (or DATABASE_URL) from .env automatically.

param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

# Load .env if present
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+?)\s*=\s*(.*)\s*$") {
            $name = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"').Trim("'")
            if (-not [Environment]::GetEnvironmentVariable($name)) {
                [Environment]::SetEnvironmentVariable($name, $val, "Process")
            }
        }
    }
}

$mysqlUrl = $env:MYSQL_URL
if (-not $mysqlUrl) { $mysqlUrl = $env:DATABASE_URL }
if (-not $mysqlUrl) {
    throw "MYSQL_URL (or DATABASE_URL) is not set in environment or .env"
}

$uri = [System.Uri]$mysqlUrl
$userInfo = $uri.UserInfo.Split(":", 2)
$dbUser = [System.Uri]::UnescapeDataString($userInfo[0])
$dbPass = if ($userInfo.Length -gt 1) { [System.Uri]::UnescapeDataString($userInfo[1]) } else { "" }
$dbHost = $uri.Host
$dbPort = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
$dbName = $uri.AbsolutePath.TrimStart("/")

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $BackupDir "backup_${dbName}_${timestamp}.sql"

$env:MYSQL_PWD = $dbPass
try {
    Write-Host "[Backup] Dumping MySQL database '$dbName' from ${dbHost}:${dbPort}..."
    & mysqldump --host=$dbHost --port=$dbPort --user=$dbUser --single-transaction --routines --triggers --quick $dbName | Out-File -FilePath $outFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump exited with code $LASTEXITCODE"
    }
    Write-Host "[Backup] Saved: $outFile"
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

# Rotate backups older than RetentionDays
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "backup_${dbName}_*.sql" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "[Backup] Pruned old backup: $($_.Name)"
}
