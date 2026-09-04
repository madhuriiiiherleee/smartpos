"""
One-off migration: adds the nullable products.hsn_code column.

Safe to run multiple times (idempotent) — checks the live schema first.

Run once: python -m app.migrate_add_hsn_code
"""
from sqlalchemy import inspect, text

from app import models  # noqa: F401 - registers all tables on Base.metadata
from app.database import Base, engine


def migrate():
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    columns = {col["name"] for col in inspector.get_columns("products")}

    if "hsn_code" in columns:
        print("Already migrated, nothing to do.")
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE products ADD COLUMN hsn_code VARCHAR(20)"))

    print("Added products.hsn_code column.")


if __name__ == "__main__":
    migrate()
