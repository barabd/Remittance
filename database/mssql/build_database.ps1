# Creates database frms_ops (if missing) and applies all DDL scripts in dependency order.
# Run from anywhere, e.g.:
#   powershell -ExecutionPolicy Bypass -File database/mssql/build_database.ps1
#   powershell -ExecutionPolicy Bypass -File database/mssql/build_database.ps1 -Server ".\SQLEXPRESS" -TrustedConnection
# Requires sqlcmd on PATH (SQL Server Command Line Utilities).

param(
  [string]$Server = "localhost,1433",
  [string]$User = "sa",
  [string]$Password,
  [switch]$TrustedConnection
)

$ErrorActionPreference = "Stop"
$here = $PSScriptRoot

if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
  Write-Error "sqlcmd not found. Install SQL Server Command Line Utilities and ensure sqlcmd is on PATH."
}

if ($TrustedConnection) {
  $authArgs = @("-E")
} else {
  if (-not $Password) {
    Write-Error "Specify -Password for SQL auth, or use -TrustedConnection for Windows auth."
  }
  $authArgs = @("-U", $User, "-P", $Password)
}

$baseArgs = @("-S", $Server, "-b", "-I") + $authArgs

Write-Host "FRMS: creating database (if needed) on $Server ..."
& sqlcmd @baseArgs -i "$here\00_create_database.sql"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$ddlScripts = @(
  "operations_hub.sql",
    "permissions_and_limits.sql",
    "user_rights_security.sql",
    "administration.sql",
  "audit_monitoring.sql",
  "masters_aml.sql",
  "risk_controls.sql",
  "investigation_cases.sql",
  "bulk_hub_log.sql",
  "eh_bulk_upload.sql",
  "settlement_regulatory.sql",
  "remittance_approval_queue.sql",
  "disbursement_worklist.sql",
  "beftn_ack_processing.sql",
  "remittance_tracking_mla.sql",
  "blocked_remittance_report.sql",
  "report_requests.sql",
  "export_service.sql",
  "head_office_module.sql",
  "integration_hub.sql",
  "finance.sql",
  "incentive_distribution.sql",
  "pricing.sql",
  "corporate_file_mapping.sql",
  "security_utilities.sql",
  "security_vapt.sql"
)

foreach ($f in $ddlScripts) {
  $path = Join-Path $here $f
  if (-not (Test-Path $path)) {
    Write-Error "Missing script: $path"
  }
  Write-Host "FRMS: applying $f ..."
  & sqlcmd @baseArgs -d frms_ops -i $path
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "FRMS: database build finished OK."
