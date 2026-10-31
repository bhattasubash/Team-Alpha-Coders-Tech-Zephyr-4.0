"""Reset demo data to a clean state for testing."""

import sys


def main():
    """Drop and re-seed demo data."""
    # When the DB layer is ready, this will:
    # 1. Delete all bookings created by demo users
    # 2. Delete all proposals created by demo users
    # 3. Reset the schedule to the baseline export
    # 4. Re-seed demo accounts via seed_demo

    print("Reset demo data (DB not connected yet):")
    print()
    print("  This script will eventually:")
    print("    1. Delete all bookings from demo users")
    print("    2. Delete all proposals from demo users")
    print("    3. Reset schedule to baseline")
    print("    4. Re-seed demo accounts")
    print()
    print("Connect the database layer first.")
    sys.exit(0)


if __name__ == "__main__":
    main()
