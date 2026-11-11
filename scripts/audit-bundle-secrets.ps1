# Edgi Client Bundle Secret Leakage Audit Script
# Scans apps/web/.next/static for private environment variables and keys

$ErrorActionPreference = "Stop"

$staticDir = "apps/web/.next/static"
if (-not (Test-Path $staticDir)) {
    Write-Error "Static directory $staticDir does not exist. Run next build first."
    exit 1
}

Write-Host "🔍 Auditing Next.js client bundle chunks for private secret leakage..." -ForegroundColor Cyan

# Sensitive strings and patterns to test against
$sensitivePatterns = @(
    "postgresql://",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "RESEND_API_KEY",
    "GEMINI_API_KEY",
    "postgrespassword",
    "AIzaSy"
)

$jsFiles = Get-ChildItem -Path $staticDir -Recurse -Filter "*.js"
$leakDetected = $false

foreach ($file in $jsFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    foreach ($pattern in $sensitivePatterns) {
        if ($content.Contains($pattern)) {
            Write-Host "❌ LEAK DETECTED in $($file.Name): Found sensitive pattern '$pattern'" -ForegroundColor Red
            $leakDetected = $true
        }
    }
}

if (-not $leakDetected) {
    Write-Host "✅ PASSED: Zero private secrets or database connection strings found in client bundle." -ForegroundColor Green
    Write-Host "   Total JavaScript chunks scanned: $($jsFiles.Count)"
} else {
    Write-Error "Secret leakage detected in client bundle!"
    exit 1
}
