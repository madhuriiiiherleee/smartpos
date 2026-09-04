"""
One-off migration: introduces the packing_sizes master table and converts
ProductDetail.packing_size from a free-text column into a packing_size_id
foreign key. Existing free-text values are preserved verbatim as PackingSize
labels (best-effort split into value/unit metadata), so no data is lost.

Safe to run multiple times (idempotent) — it inspects the live schema before
each step and skips work that has already been done.

Run once: python -m app.migrate_packing_sizes
"""
import re

from sqlalchemy import inspect, text

from app import models  # noqa: F401 - registers all tables on Base.metadata
from app.database import Base, engine

VALUE_UNIT_RE = re.compile(r"^\s*([\d.]+)\s*(.*)$")


def split_value_unit(raw: str) -> tuple[float | None, str]:
    match = VALUE_UNIT_RE.match(raw)
    if match and match.group(2).strip():
        try:
            return float(match.group(1)), match.group(2).strip()
        except ValueError:
            pass
    return None, raw.strip()


def migrate():
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("product_details")}

    if "packing_size_id" in columns and "packing_size" not in columns:
        print("Already migrated, nothing to do.")
        return

    with engine.begin() as conn:
        if "packing_size_id" not in columns:
            conn.execute(text("ALTER TABLE product_details ADD COLUMN packing_size_id INTEGER"))

            distinct_values = [
                row[0]
                for row in conn.execute(
                    text("SELECT DISTINCT packing_size FROM product_details WHERE packing_size IS NOT NULL")
                ).all()
            ]

            for raw in distinct_values:
                existing = conn.execute(
                    text("SELECT id FROM packing_sizes WHERE label = :label"), {"label": raw}
                ).first()
                if existing:
                    continue
                value, unit = split_value_unit(raw)
                conn.execute(
                    text(
                        "INSERT INTO packing_sizes (value, unit, label, active) "
                        "VALUES (:value, :unit, :label, true)"
                    ),
                    {"value": value, "unit": unit, "label": raw},
                )

            conn.execute(
                text(
                    "UPDATE product_details pd SET packing_size_id = ps.id "
                    "FROM packing_sizes ps WHERE pd.packing_size = ps.label"
                )
            )

            conn.execute(text("ALTER TABLE product_details ALTER COLUMN packing_size_id SET NOT NULL"))
            conn.execute(
                text(
                    "ALTER TABLE product_details "
                    "ADD CONSTRAINT fk_product_details_packing_size "
                    "FOREIGN KEY (packing_size_id) REFERENCES packing_sizes (id)"
                )
            )
            print(f"Backfilled packing_size_id for product_details from {len(distinct_values)} distinct labels.")

        if "packing_size" in columns:
            conn.execute(text("ALTER TABLE product_details DROP COLUMN packing_size"))
            print("Dropped legacy product_details.packing_size column.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
