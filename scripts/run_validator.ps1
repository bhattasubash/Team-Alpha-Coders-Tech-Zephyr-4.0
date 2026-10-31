# Run the validator on a given schedule file.
# Usage: .\scripts\run_validator.ps1 exports\schedule.json

param(
    [string]$ScheduleFile = "exports\schedule.json",
    [string]$ReportFile = "exports\report.json"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataFile = Join-Path $ProjectRoot "data\cit_public.json"

if (-not (Test-Path $DataFile)) {
    Write-Error "Dataset not found: $DataFile"
    exit 1
}

$SchedulePath = Join-Path $ProjectRoot $ScheduleFile
if (-not (Test-Path $SchedulePath)) {
    Write-Error "Schedule not found: $SchedulePath"
    exit 1
}

$ReportPath = Join-Path $ProjectRoot $ReportFile

Write-Host "Validating: $SchedulePath"
Write-Host "Dataset:    $DataFile"
Write-Host "Report:     $ReportPath"
Write-Host ""

$PythonExe = Join-Path $ProjectRoot "backend\venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    $PythonExe = "python"
}

& $PythonExe (Join-Path $ProjectRoot "validator\validator.py") `
    --data $DataFile `
    --schedule $SchedulePath `
    --json $ReportPath

Write-Host ""
Write-Host "Validation complete. Report written to $ReportPath"
