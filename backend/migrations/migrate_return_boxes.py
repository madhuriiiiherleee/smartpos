"""
One-off migration: records the box/piece split on sales_return_items so a credit
note can print "2 boxes" instead of only a piece count, and keeps printing the
right number even if the product's qty_per_box is edited later.

`quantity` remains the authoritative piece total — stock, pricing and the
returnable cap all continue to use it. The three new columns are a frozen
snapshot for display only. Integer division in the backfill is deliberate, so
boxes * qty_per_box + loose_units always reconstructs quantity exactly.

Existing rows are backfilled by deriving the split from the quantity and the
pack size recorded on the sale line, so historical credit notes show the same
"N box + M pcs" text they effectively always meant.

Safe to run multiple times (idempotent) — checks the live schema first.

Run once (from the backend directory): python -m migrations.migrate_return_boxes
"""
from sqlalchemy import inspect, text

from app import models  # noqa: F401 - registers all tables on Base.metadata
from app.database import Base, engine

NEW_COLUMNS = ("boxes", "loose_units", "qty_per_box")


def migrate():
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("sales_return_items")}
    added = [col for col in NEW_COLUMNS if col not in existing]

    with engine.begin() as conn:
        for col in added:
            conn.execute(text(f"ALTER TABLE sales_return_items ADD COLUMN {col} INTEGER"))

        if added:
            # Re-derive the split from the stored piece count and the pack size
            # recorded on the sale line, so historical credit notes show the same
            # "N box + M pcs" text they effectively always meant. A pack size of
            # 1 (or a missing pack) is loose-only.
            conn.execute(
                text(
                    "UPDATE sales_return_items sri SET "
                    "  qty_per_box = COALESCE(pd.qty_per_box, 1), "
                    "  boxes = CASE WHEN COALESCE(pd.qty_per_box, 1) > 1 "
                    "    THEN sri.quantity / COALESCE(pd.qty_per_box, 1) ELSE 0 END, "
                    "  loose_units = CASE WHEN COALESCE(pd.qty_per_box, 1) > 1 "
                    "    THEN sri.quantity % COALESCE(pd.qty_per_box, 1) ELSE sri.quantity END "
                    "FROM sale_items si "
                    "LEFT JOIN product_details pd ON pd.id = si.product_detail_id "
                    "WHERE si.id = sri.sale_item_id"
                )
            )

    if added:
        print(f"Added and backfilled sales_return_items: {', '.join(added)}.")
        print("Migration complete.")
    else:
        print("Already migrated, nothing to do.")


if __name__ == "__main__":
    migrate()
