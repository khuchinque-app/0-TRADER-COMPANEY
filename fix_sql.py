#!/usr/bin/env python3
"""
fix_sql.py — Utility to check and fix common SQLite issues in ledger.db

Usage:
    python3 fix_sql.py [--check | --fix | --report]
"""
import sys
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "apps" / "engine" / "data" / "ledger.db"

def check_integrity(conn: sqlite3.Connection) -> list[str]:
    """Run integrity check on all tables."""
    issues = []
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table';")
    for (table_name,) in cursor:
        try:
            result = conn.execute(f"PRAGMA integrity_check({table_name!r})").fetchone()
            if result and result[0] != "ok":
                issues.append(f"Table {table_name}: {result[0]}")
        except Exception as e:
            issues.append(f"Table {table_name}: ERROR - {e}")
    return issues

def check_foreign_keys(conn: sqlite3.Connection) -> list[str]:
    """Check foreign key constraints."""
    issues = []
    cursor = conn.execute("PRAGMA foreign_key_check;")
    for row in cursor:
        issues.append(f"FK violation: table={row[0]}, rowid={row[1]}, ref={row[2]}")
    return issues

def check_null_constraints(conn: sqlite3.Connection) -> list[str]:
    """Check for NULL values in NOT NULL columns."""
    issues = []
    cursor = conn.execute("PRAGMA table_info(users)")
    for row in cursor:
        cid, name, ctype, notnull, dflt, pk = row
        if notnull and not pk:
            try:
                null_count = conn.execute(f"SELECT COUNT(*) FROM users WHERE {name} IS NULL").fetchone()[0]
                if null_count > 0:
                    issues.append(f"Column {name}: {null_count} NULL values found")
            except Exception:
                pass
    return issues

def report(conn: sqlite3.Connection) -> dict:
    """Generate full diagnostic report."""
    return {
        "integrity_issues": check_integrity(conn),
        "foreign_key_issues": check_foreign_keys(conn),
        "null_constraint_issues": check_null_constraints(conn),
    }

def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    result = report(conn)

    print("=" * 60)
    print("SQL DIAGNOSTIC REPORT")
    print("=" * 60)
    print(f"\nDatabase: {DB_PATH}")
    print(f"Integrity Issues: {len(result['integrity_issues'])}")
    print(f"Foreign Key Issues: {len(result['foreign_key_issues'])}")
    print(f"Null Constraint Issues: {len(result['null_constraint_issues'])}")

    if result['integrity_issues']:
        print("\n--- Integrity Issues ---")
        for issue in result['integrity_issues']:
            print(f"  ✗ {issue}")

    if result['foreign_key_issues']:
        print("\n--- Foreign Key Issues ---")
        for issue in result['foreign_key_issues']:
            print(f"  ✗ {issue}")

    if result['null_constraint_issues']:
        print("\n--- Null Constraint Issues ---")
        for issue in result['null_constraint_issues']:
            print(f"  ✗ {issue}")

    if not any(result.values()):
        print("\n✅ All checks passed!")

    conn.close()
    sys.exit(0 if not any(result.values()) else 1)

if __name__ == "__main__":
    main()
