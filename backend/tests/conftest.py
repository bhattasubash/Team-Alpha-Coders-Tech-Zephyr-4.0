"""Pytest fixtures for loading the dataset and validator."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Add project paths so imports work
PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PROJECT_ROOT.parent

# Make the backend package importable
sys.path.insert(0, str(PROJECT_ROOT))

DATA_PATH = REPO_ROOT / "data" / "cit_public.json"
VALIDATOR_PATH = REPO_ROOT / "validator" / "validator.py"


@pytest.fixture(scope="session")
def dataset() -> dict:
    """Load the official CIT dataset once for all tests."""
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def validator_module():
    """Import the official validator.py as a module for differential testing."""
    import importlib.util

    spec = importlib.util.spec_from_file_location("validator", VALIDATOR_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
