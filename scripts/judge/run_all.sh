#!/usr/bin/env bash
set -e

echo "===================================================="
echo "CIT SCHEDULER: JUDGE AUDIT REPRODUCTION SUITE"
echo "===================================================="

PYTHON="backend/venv/bin/python"
if [ ! -f "$PYTHON" ]; then
    PYTHON="python3"
fi

echo -e "\n[1/7] Running Unit & Integration Test Suite (70 tests)..."
$PYTHON -m pytest backend/tests -v --tb=short

echo -e "\n[2/7] Running Differential Fuzzing (5000 cases, seed 20261101)..."
$PYTHON scripts/judge/fuzz_5000_new_seed.py

echo -e "\n[3/7] Running Parity Placement Checker vs Validator (1500 moves)..."
$PYTHON scripts/judge/parity_placement.py

echo -e "\n[4/7] Running Time Resolver & Hinglish Lexicon Property Tests..."
$PYTHON scripts/judge/property_time_resolver.py

echo -e "\n[5/7] Running 30 Random Disruption Scenarios (Fewest Moves Audit)..."
$PYTHON scripts/judge/random_disruptions.py

echo -e "\n[6/7] Running Independent AI Prompts & Adversarial LLM Tests..."
$PYTHON scripts/judge/independent_ai_prompts.py
$PYTHON scripts/judge/adversarial_llm_test.py

echo -e "\n[7/7] Running Deployed Auth & Security Audits..."
$PYTHON scripts/judge/test_deployed_auth.py
$PYTHON scripts/judge/test_security_lite.py

echo -e "\n===================================================="
echo "All judge audit scripts completed. Evidence saved to docs/judge_evidence/."
echo "===================================================="
