# =============================================
# Push da correcao sqlite3 - GolBet
# =============================================

$PROJETO = "C:\Users\joaop\GolBet"
Set-Location $PROJETO

Write-Host "Adicionando correcao do sqlite3..." -ForegroundColor Cyan
git add .npmrc
git commit -m "fix: force sqlite3 build from source for Linux"

Write-Host "Enviando para o GitHub..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "PRONTO! Correcao enviada!" -ForegroundColor Green
    Write-Host "O Render vai iniciar um novo deploy automaticamente." -ForegroundColor Green
} else {
    Write-Host "Erro ao enviar." -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
