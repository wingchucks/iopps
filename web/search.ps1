try {
    Set-Location "C:\Users\natha\iopps\web"
    Write-Host "🔍 Running Premium Partner search..." -ForegroundColor Green
    
    $result = & node search-to-file.js 2>&1
    
    if (Test-Path "premium-partner-results.txt") {
        Write-Host "✅ Search completed! Results:" -ForegroundColor Green
        Get-Content "premium-partner-results.txt"
    } else {
        Write-Host "❌ Results file not found. Error output:" -ForegroundColor Red
        Write-Host $result
    }
} catch {
    Write-Host "❌ PowerShell execution error: $($_.Exception.Message)" -ForegroundColor Red
}