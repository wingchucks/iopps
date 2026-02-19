Write-Host "🚀 EXECUTING PREMIUM PARTNER MIGRATION..." -ForegroundColor Green
Write-Host "=" -ForegroundColor Yellow

try {
    Set-Location "C:\Users\natha\iopps\web"
    
    Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Cyan
    Write-Host "🔍 Checking for Node.js..." -ForegroundColor Cyan
    
    $nodeVersion = & node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ Node.js not found!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🚀 Running migration script..." -ForegroundColor Yellow
    & node migrate-now.js
    
    Write-Host "✅ Migration execution completed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ PowerShell error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}