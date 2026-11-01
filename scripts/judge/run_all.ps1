# Judge Audit Full Reproduction Script (PowerShell)
# Usage: .\scripts\judge\run_all.ps1

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "CIT SCHEDULER: JUDGE AUDIT REPRODUCTION SUITE" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$Python = "backend\venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    $Python = "python"
}

Write-Host "`n[1/7] Running Unit & Integration Test Suite (70 tests)..." -ForegroundColor Yellow
& $Python -m pytest backend/tests -v --tb=short

Write-Host "`n[2/7] Running Differential Fuzzing (5000 cases, seed 20261101)..." -ForegroundColor Yellow
& $Python scripts/judge/fuzz_5000_new_seed.py

Write-Host "`n[3/7] Running Parity Placement Checker vs Validator (1500 moves)..." -ForegroundColor Yellow
& $Python scripts/judge/parity_placement.py

Write-Host "`n[4/7] Running Time Resolver & Hinglish Lexicon Property Tests..." -ForegroundColor Yellow
& $Python scripts/judge/property_time_resolver.py

Write-Host "`n[5/7] Running 30 Random Disruption Scenarios (Fewest Moves Audit)..." -ForegroundColor Yellow
& $Python scripts/judge/random_disruptions.py

Write-Host "`n[6/7] Running Independent AI Prompts & Adversarial LLM Tests..." -ForegroundColor Yellow
& $Python scripts/judge/independent_ai_prompts.py
& $Python scripts/judge/adversarial_llm_test.py

Write-Host "`n[7/7] Running Deployed Auth & Security Audits..." -ForegroundColor Yellow
& $Python scripts/judge/test_deployed_auth.py
& $Python scripts/judge/test_security_lite.py

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "All judge audit scripts completed. Evidence saved to docs/judge_evidence/." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
