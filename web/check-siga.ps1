Write-Host "🔍 CHECKING SIGA RSS FEED STATUS..." -ForegroundColor Green
Write-Host "=" -ForegroundColor Yellow

try {
    Set-Location "C:\Users\natha\iopps\web"
    Write-Host "📍 Running SIGA RSS feed check..." -ForegroundColor Cyan
    
    & node check-siga-rss.js
    
    Write-Host "✅ SIGA RSS check completed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}