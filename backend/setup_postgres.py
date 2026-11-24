import sys
import os
import argparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def setup_postgresql(user="postgres", password="", host="localhost", port=5432, db_name="finance_db"):
    print("=" * 60)
    print("AI Personal Finance System - PostgreSQL Setup & Migration")
    print("=" * 60)
    print(f"Connecting to PostgreSQL server at {host}:{port} as user '{user}'...")

    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname="postgres",
            connect_timeout=5
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        print("✓ Connected to PostgreSQL server successfully!")
    except Exception as e:
        print(f"✗ Failed to connect to PostgreSQL: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL service is running on port 5432.")
        print("2. The superuser password you passed is correct.")
        sys.exit(1)

    # Check if database exists
    cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';")
    exists = cur.fetchone()
    if not exists:
        print(f"Creating database '{db_name}'...")
        cur.execute(f'CREATE DATABASE "{db_name}";')
        print(f"✓ Database '{db_name}' created successfully!")
    else:
        print(f"✓ Database '{db_name}' already exists.")

    cur.close()
    conn.close()

    # Update backend/.env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    pg_url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"

    lines = []
    updated = False
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    lines.append(f'DATABASE_URL="{pg_url}"\n')
                    updated = True
                else:
                    lines.append(line)

    if not updated:
        lines.append(f'DATABASE_URL="{pg_url}"\n')

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"✓ Updated backend/.env with DATABASE_URL: postgresql://{user}:****@{host}:{port}/{db_name}")

    # Set environment variable in current process so app uses it
    os.environ["DATABASE_URL"] = pg_url

    # Run DB migration and initialization
    print("\nCreating tables and seeding default categories & accounts in PostgreSQL...")
    from app.main import init_db
    init_db()
    print("✓ All tables created and demo accounts seeded in PostgreSQL successfully!")
    print("=" * 60)
    print("PostgreSQL is now fully configured and ready for the application!")
    print("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Configure PostgreSQL for Personal Finance App")
    parser.add_argument("--password", "-p", type=str, required=True, help="PostgreSQL superuser password")
    parser.add_argument("--user", "-u", type=str, default="postgres", help="PostgreSQL user (default: postgres)")
    parser.add_argument("--host", type=str, default="localhost", help="PostgreSQL host (default: localhost)")
    parser.add_argument("--port", type=int, default=5432, help="PostgreSQL port (default: 5432)")
    parser.add_argument("--dbname", "-d", type=str, default="finance_db", help="Target database name (default: finance_db)")

    args = parser.parse_args()
    setup_postgresql(
        user=args.user,
        password=args.password,
        host=args.host,
        port=args.port,
        db_name=args.dbname
    )
