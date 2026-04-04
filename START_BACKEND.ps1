# ============================================
# Start FRMS Backend (Spring Boot)
# ============================================
# Run this after Java + Maven are installed
# ============================================

$ProjectPath = "C:\Users\BARABD\Desktop\Remittance\server\frms-ops-api"

Write-Host "========== Starting FRMS Backend ==========" -ForegroundColor Cyan
Write-Host "Project: $ProjectPath`n" -ForegroundColor Yellow

# Verify Java and Maven are available
Write-Host "[1/3] Verifying Java and Maven..." -ForegroundColor Yellow

try {
    $javaVersion = & java -version 2>&1 | Select-Object -First 1
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found! Install it first using: INSTALL_JAVA_MAVEN.ps1" -ForegroundColor Red
    exit 1
}

try {
    $mavenVersion = & mvn --version 2>&1 | Select-Object -First 1
    Write-Host "✓ Maven found: $mavenVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Maven not found! Install it first using: INSTALL_JAVA_MAVEN.ps1" -ForegroundColor Red
    exit 1
}

# Change to project directory
Write-Host "`n[2/3] Navigating to backend directory..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectPath\pom.xml")) {
    Write-Host "✗ pom.xml not found at: $ProjectPath" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath
Write-Host "✓ In directory: $(Get-Location)" -ForegroundColor Green

# Start backend
Write-Host "`n[3/3] Starting Spring Boot backend..." -ForegroundColor Yellow
Write-Host "This may take 30-45 seconds on first run (downloading dependencies)...`n" -ForegroundColor Cyan

mvn spring-boot:run

Write-Host "`n========== Backend Stopped ==========" -ForegroundColor Yellow
