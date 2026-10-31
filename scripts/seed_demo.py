"""Seed demo user accounts for development and testing."""

import sys

DEMO_ACCOUNTS = [
    {"email": "admin@cit.edu", "password": "admin123", "role": "admin", "name": "Admin User"},
    {"email": "coordinator@cit.edu", "password": "coord123", "role": "coordinator", "name": "Coordinator User"},
    {"email": "faculty@cit.edu", "password": "faculty123", "role": "faculty", "name": "Faculty User"},
    {"email": "club@cit.edu", "password": "club123", "role": "club", "name": "Club User"},
]


def main():
    """Insert demo accounts into the database."""
    # When the DB layer is ready, this will:
    # 1. Connect to the database
    # 2. Hash each password with bcrypt
    # 3. Upsert each account (skip if exists)

    print("Demo accounts (DB not connected yet):")
    print()
    for account in DEMO_ACCOUNTS:
        print(f"  {account['role']:>12}  {account['email']}  /  {account['password']}")
    print()
    print("Connect the database layer to seed these accounts for real.")
    sys.exit(0)


if __name__ == "__main__":
    main()
