# =============================================
# Script para enviar codigo ao GitHub - GolBet
# =============================================

# Caminho fixo para a pasta do projeto
$PROJETO = "C:\Users\joaop\GolBet"

Write-Host "Entrando na pasta do projeto: $PROJETO" -ForegroundColor Cyan
Set-Location $PROJETO

# Remove .git corrompido se existir (estava na pasta errada antes)
if (Test-Path ".git") {
    Write-Host "Removendo .git antigo..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".git"
}

# Inicializa o repositorio
Write-Host "Inicializando repositorio git..." -ForegroundColor Cyan
git init -b main

# Configura usuario
git config user.email "joaopedroxisto10@gmail.com"
git config user.name "Joao Pedro"

# Adiciona remote
Write-Host "Configurando remote..." -ForegroundColor Cyan
git remote add origin https://github.com/jpxisto/golbet.git

# Adiciona todos os arquivos do projeto
Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Lista o que sera enviado
Write-Host "Arquivos prontos para commit:" -ForegroundColor Yellow
git status --short

# Commit
Write-Host "Fazendo commit..." -ForegroundColor Cyan
git commit -m "GolBet inicial"

# Envia para o GitHub
Write-Host "Enviando para o GitHub..." -ForegroundColor Cyan
git push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "PRONTO! Codigo enviado com sucesso!" -ForegroundColor Green
    Write-Host "https://github.com/jpxisto/golbet" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Erro ao enviar. Tente fazer login no GitHub pelo browser e tente de novo." -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
