# Run Full FRMS Project (Frontend + Backend + Mock API)
# Copy and paste this entire command into PowerShell

$env:JAVA_HOME = "C:\tools\jdk-17"; $env:MAVEN_HOME = "C:\tools\maven-3.9.6"; $env:Path = "C:\tools\jdk-17\bin;C:\tools\maven-3.9.6\bin;$env:Path"; $env:FRMS_SECURITY_ENABLED = "true"; $env:FRMS_JWT_SECRET = "your-secret-key-at-least-32-bytes-long-change-in-production-12345"; cd "C:\Users\BARABD\Desktop\Remittance"; npm run dev:full
