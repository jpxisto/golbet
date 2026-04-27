# =============================================
# Script de configuração Git + GitHub - GolBet
# =============================================

$GITHUB_USER = "jpxisto"
$REPO_NAME = "golbet"
$REMOTE_URL = "https://github.com/jpxisto/golbet.git"

Write-Host "Iniciando configuracao do GolBet no GitHub..." -ForegroundColor Cyan

# Vai para a pasta do projeto
Set-Location $PSScriptRoot

# Remove .git corrompido se existir
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

# Adiciona todos os arquivos
Write-Host "Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Primeiro commit
Write-Host "Fazendo primeiro commit..." -ForegroundColor Cyan
git commit -m "GolBet inicial"

# Conecta ao GitHub
Write-Host "Conectando ao GitHub..." -ForegroundColor Cyan
git remote add origin $REMOTE_URL

# Envia para o GitHub
Write-Host "Enviando codigo para o GitHub (pode pedir login)..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "PRONTO! Codigo enviado para:" -ForegroundColor Green
Write-Host "https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Green
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
