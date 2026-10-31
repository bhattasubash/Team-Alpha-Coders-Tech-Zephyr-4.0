#!/usr/bin/env bash
# Run the validator on a given schedule file.
# Usage: ./scripts/run_validator.sh exports/schedule.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DATA_FILE="${PROJECT_ROOT}/data/cit_public.json"
SCHEDULE_FILE="${1:-${PROJECT_ROOT}/exports/schedule.json}"
REPORT_FILE="${2:-${PROJECT_ROOT}/exports/report.json}"

if [ ! -f "$DATA_FILE" ]; then
    echo "Dataset not found: $DATA_FILE"
    exit 1
fi

if [ ! -f "$SCHEDULE_FILE" ]; then
    echo "Schedule not found: $SCHEDULE_FILE"
    exit 1
fi

echo "Validating: $SCHEDULE_FILE"
echo "Dataset:    $DATA_FILE"
echo "Report:     $REPORT_FILE"
echo ""

python "${PROJECT_ROOT}/validator/validator.py" \
    --data "$DATA_FILE" \
    --schedule "$SCHEDULE_FILE" \
    --json "$REPORT_FILE"

echo ""
echo "Validation complete. Report written to $REPORT_FILE"
