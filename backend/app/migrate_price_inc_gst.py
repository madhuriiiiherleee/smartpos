"""
One-off migration: adds the `price_inc_gst` flag to sale_items and
purchase_items so the "this price already includes GST" toggle round-trips
through the API and is not lost (as False) when an invoice is edited and
re-saved.

Existing rows are backfilled by reverse-computing the flag from the stored
amounts: if `taxable_amount` matches the GST-inclusive derivation (and not
the exclusive one), the row was saved as "price incl. GST". Ambiguous rows
(GST = 0, or both derivations round to the same taxable amount) are left
False, which is consistent with the exclusive derivation always being used.

Safe to run multiple times (idempotent) — checks the live schema first.

Run once: python -m app.migrate_price_inc_gst
"""
from sqlalchemy import inspect, text

from app import models  # noqa: F401 - registers all tables on Base.metadata
from app.database import Base, engine


def _migrate_table(conn, table: str, price_column: str) -> bool:
    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns(table)}
    if "price_inc_gst" in columns:
        print(f"{table}.price_inc_gst already exists, nothing to do.")
        return False

    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN price_inc_gst BOOLEAN NOT NULL DEFAULT FALSE"))
    conn.execute(
        text(
            f"UPDATE {table} SET price_inc_gst = TRUE "
            f"WHERE gst_percent > 0 "
            f"AND round((quantity * {price_column} * (1 - discount_percent / 100)) / (1 + gst_percent / 100), 2) "
            f"= round(taxable_amount, 2) "
            f"AND round(quantity * {price_column} * (1 - discount_percent / 100), 2) <> round(taxable_amount, 2)"
        )
    )
    print(f"Added and backfilled {table}.price_inc_gst.")
    return True


def migrate():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        did_sales = _migrate_table(conn, "sale_items", "price")
        did_purchase = _migrate_table(conn, "purchase_items", "purchase_price")

    if not did_sales and not did_purchase:
        print("Already migrated, nothing to do.")
    else:
        print("Migration complete.")


if __name__ == "__main__":
    migrate()