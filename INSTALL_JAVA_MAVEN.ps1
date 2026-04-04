# Install Java 17 + Maven 3.9 for FRMS Backend
$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

Write-Host "========== FRMS Backend Setup ==========" -ForegroundColor Cyan

$InstallDir = "C:\tools"
$JavaDir = "$InstallDir\jdk-17"
$MavenDir = "$InstallDir\maven-3.9.6"

if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Step 1: Install Java 17
Write-Host "`n[1/3] Installing Java 17 LTS..." -ForegroundColor Yellow

if (Test-Path "$JavaDir\bin\java.exe") {
    Write-Host "  ✓ Java already installed" -ForegroundColor Green
} else {
    Write-Host "  Downloading Java 17..."
    $JavaUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"
    $JavaZip = "$InstallDir\jdk-17.zip"
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $JavaUrl -OutFile $JavaZip -UseBasicParsing 2>&1 | Out-Null
    Write-Host "  ✓ Downloaded" -ForegroundColor Green
    
    Write-Host "  Extracting..."
    Expand-Archive -Path $JavaZip -DestinationPath $InstallDir -Force 2>&1 | Out-Null
    $ExtractedDir = Get-ChildItem -Path $InstallDir -Directory -Filter "jdk-*" | Select-Object -First 1
    if ($ExtractedDir) {
        Rename-Item -Path $ExtractedDir.FullName -NewName "jdk-17" -Force 2>&1 | Out-Null
    }
    Remove-Item -Path $JavaZip -Force 2>&1 | Out-Null
    Write-Host "  ✓ Installed" -ForegroundColor Green
}

# Step 2: Install Maven 3.9
Write-Host "`n[2/3] Installing Maven 3.9..." -ForegroundColor Yellow

if (Test-Path "$MavenDir\bin\mvn.cmd") {
    Write-Host "  ✓ Maven already installed" -ForegroundColor Green
} else {
    Write-Host "  Downloading Maven 3.9..."
    $MavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip"
    $MavenZip = "$InstallDir\maven.zip"
    
    Invoke-WebRequest -Uri $MavenUrl -OutFile $MavenZip -UseBasicParsing 2>&1 | Out-Null
    Write-Host "  ✓ Downloaded" -ForegroundColor Green
    
    Write-Host "  Extracting..."
    Expand-Archive -Path $MavenZip -DestinationPath $InstallDir -Force 2>&1 | Out-Null
    Rename-Item -Path "$InstallDir\apache-maven-3.9.6" -NewName "maven-3.9.6" -Force 2>&1 | Out-Null
    Remove-Item -Path $MavenZip -Force 2>&1 | Out-Null
    Write-Host "  ✓ Installed" -ForegroundColor Green
}

# Step 3: Configure Environment
Write-Host "`n[3/3] Configuring Environment..." -ForegroundColor Yellow

[Environment]::SetEnvironmentVariable("JAVA_HOME", $JavaDir, "User") 2>&1 | Out-Null
[Environment]::SetEnvironmentVariable("MAVEN_HOME", $MavenDir, "User") 2>&1 | Out-Null

$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($CurrentPath -notlike "*jdk-17*") {
    [Environment]::SetEnvironmentVariable("Path", "$JavaDir\bin;$MavenDir\bin;$CurrentPath", "User") 2>&1 | Out-Null
}

$env:JAVA_HOME = $JavaDir
$env:MAVEN_HOME = $MavenDir
$env:Path = "$JavaDir\bin;$MavenDir\bin;$env:Path"

Write-Host "  ✓ Environment configured" -ForegroundColor Green

# Verify
Write-Host "`n========== Verification ==========" -ForegroundColor Cyan
& "$JavaDir\bin\java.exe" -version 2>&1 | Select-Object -First 2
& "$MavenDir\bin\mvn.cmd" --version 2>&1 | Select-Object -First 2

Write-Host "`n✅ Installation Complete!`n" -ForegroundColor Green
Write-Host "IMPORTANT: Close and reopen PowerShell for PATH changes!`n" -ForegroundColor Yellow
