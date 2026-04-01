param(
  [string]$HostName = "10.111.47.248",
  [string]$UserName = "barabd",
  [string]$Password = "Admin@2022",
  [string]$RemotePath = "/home/barabd/apps/remittance",
  [string]$Branch = "main",
  [int]$TimeoutSec = 900
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Checking Posh-SSH module..."
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Write-Host "Posh-SSH not found. Installing NuGet provider and Posh-SSH..."
  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser | Out-Null
  Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
  Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber
}

Import-Module Posh-SSH -Force

Write-Host "[2/4] Opening SSH session to $UserName@$HostName ..."
$securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($UserName, $securePassword)
$session = New-SSHSession -ComputerName $HostName -Credential $credential -AcceptKey -ErrorAction Stop

try {
  Write-Host "[3/4] Running remote deploy command..."
  $remoteCmd = "cd $RemotePath && git pull origin $Branch && bash ./deploy.sh"
  $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $remoteCmd -TimeOut ($TimeoutSec * 1000)

  Write-Host "\n--- REMOTE STDOUT ---"
  $result.Output | ForEach-Object { Write-Host $_ }

  Write-Host "\n--- REMOTE STDERR ---"
  $result.Error | ForEach-Object { Write-Host $_ }

  if ($result.ExitStatus -ne 0) {
    throw "Remote deploy failed with exit code $($result.ExitStatus)."
  }

  Write-Host "[4/4] Deploy completed successfully." -ForegroundColor Green
}
finally {
  if ($session) {
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
  }
}
