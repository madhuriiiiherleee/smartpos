"""
One-off migration: drops the obsolete ProductDetail.rate_per_unit and
ProductDetail.retail_price columns (wholesale/retail pricing was removed;
MRP / Qty per Box is the only price source now).

Safe to run multiple times (idempotent) — checks the live schema first.

Run once (from the backend directory): python -m migrations.migrate_drop_rate_fields
"""
from sqlalchemy import inspect, text

from app.database import engine

DROPS = (
    ("rate_per_unit", "product_details"),
    ("retail_price", "product_details"),
)


def migrate():
    with engine.begin() as conn:
        columns = {
            (col["name"], table)
            for table in inspect(conn).get_table_names()
            for col in inspect(conn).get_columns(table)
        }
        for column, table in DROPS:
            if (column, table) not in columns:
                print(f"{table}.{column} already dropped, skipping.")
                continue
            conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
            print(f"Dropped {table}.{column}.")


if __name__ == "__main__":
    migrate()