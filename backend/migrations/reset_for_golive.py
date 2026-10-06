"""One-time script: reset database for go-live.

Keeps ONLY master data (products, categories, packing_sizes, vendors,
customers, customer_routes, company_profile, financial_years, users,
product_details).  Deletes all transactional rows, sets HSN code on
every product, and resets the sales invoice counter to 001.

Run from the backend directory on the VPS:
    cd /var/www/inventory-management/backend
    .venv/bin/python -m migrations.reset_for_golive
"""

import os
import sys

from sqlalchemy import create_engine, text


def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        # Load from .env if not in env
        env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() == "DATABASE_URL":
                            db_url = v.strip().strip('"').strip("'")
                        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

    if not db_url:
        print("ERROR: DATABASE_URL not found. Set it in .env or as env var.")
        sys.exit(1)

    engine = create_engine(db_url)

    with engine.connect() as conn:
        # ── 1. Show current counts (before) ──────────────────────────
        print("=== BEFORE ===")
        tables_to_count = [
            "sales_return_items",
            "sales_returns",
            "sale_items",
            "sales",
            "sales_order_items",
            "sales_orders",
            "customer_payments",
            "purchase_items",
            "purchases",
        ]
        for t in tables_to_count:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  {t}: {count} rows")

        product_count = conn.execute(text("SELECT COUNT(*) FROM products")).scalar()
        print(f"  products (kept): {product_count} rows")

        # ── 2. Delete all transactional data (single transaction) ────
        print("\nDeleting transactional data...")
        # Child tables first, then parents
        conn.execute(text("DELETE FROM sales_return_items"))
        conn.execute(text("DELETE FROM sales_returns"))
        conn.execute(text("DELETE FROM sale_items"))
        conn.execute(text("DELETE FROM sales"))
        conn.execute(text("DELETE FROM sales_order_items"))
        conn.execute(text("DELETE FROM sales_orders"))
        conn.execute(text("DELETE FROM customer_payments"))
        conn.execute(text("DELETE FROM purchase_items"))
        conn.execute(text("DELETE FROM purchases"))
        print("  Done.")

        # ── 3. Update HSN code on all products ────────────────────────
        print("\nUpdating HSN code to 21050000 on all products...")
        result = conn.execute(
            text("UPDATE products SET hsn_code = :hsn"), {"hsn": "21050000"}
        )
        print(f"  Updated {result.rowcount} products.")

        # ── 4. Reset sales invoice counter for active FY ──────────────
        print("\nResetting sales invoice counter for active financial year...")
        active_fy = conn.execute(
            text("SELECT id, label FROM financial_years WHERE is_active = true")
        ).fetchone()
        if active_fy:
            fy_id = active_fy[0]
            fy_label = active_fy[1]
            result = conn.execute(
                text(
                    "UPDATE purchase_series_counters "
                    "SET next_number = 1, updated_at = NOW() "
                    "WHERE series_key = 'sales' AND financial_year_id = :fy_id"
                ),
                {"fy_id": fy_id},
            )
            if result.rowcount == 0:
                # No counter row exists yet; insert one
                conn.execute(
                    text(
                        "INSERT INTO purchase_series_counters "
                        "(series_key, financial_year_id, next_number) "
                        "VALUES ('sales', :fy_id, 1)"
                    ),
                    {"fy_id": fy_id},
                )
                print(f"  Created sales counter for FY {fy_label} (id={fy_id}), next=1.")
            else:
                print(f"  Reset sales counter for FY {fy_label} (id={fy_id}) to next=1.")
        else:
            print("  WARNING: No active financial year found. Counter not reset.")

        # ── 5. Verify (after) ────────────────────────────────────────
        print("\n=== AFTER ===")
        for t in tables_to_count:
            count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  {t}: {count} rows")

        # Verify HSN
        hsn_count = conn.execute(
            text("SELECT COUNT(*) FROM products WHERE hsn_code = '21050000'")
        ).scalar()
        null_hsn = conn.execute(
            text("SELECT COUNT(*) FROM products WHERE hsn_code IS NULL")
        ).scalar()
        print(f"  products with HSN 21050000: {hsn_count}")
        print(f"  products with NULL HSN: {null_hsn}")

        # Verify counter
        if active_fy:
            counter = conn.execute(
                text(
                    "SELECT next_number FROM purchase_series_counters "
                    "WHERE series_key = 'sales' AND financial_year_id = :fy_id"
                ),
                {"fy_id": active_fy[0]},
            ).fetchone()
            if counter:
                print(f"  sales counter next_number: {counter[0]}")
                if counter[0] == 1:
                    print("  Next invoice will be: INV/" + active_fy[1] + "/0001")
            else:
                print("  sales counter: NOT FOUND")

        # Commit everything
        conn.commit()
        print("\n=== ALL CHANGES COMMITTED ===")


if __name__ == "__main__":
    main()
