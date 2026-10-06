"""
One-off migration: purchase_price on purchase_items is now the price per BOX
(as entered on Purchase Entry), not per piece.

Previously: 9 boxes × 12 pcs/box at ₹100/piece → quantity=108, price=100,
grand ≈ 10800. Now: same purchase is quantity=108 (still pieces for stock),
price=100 (per box), grand = 9 × 100 = 900.

Existing rows are rewritten so amounts stay the same under the new formula:
  purchase_price_new = purchase_price_old × qty_per_box

Idempotent: a row is only rewritten when its stored grand_amount still matches
the OLD per-piece formula (within 0.05). After conversion it matches the new
per-box formula instead, so a second run is a no-op.

Run once (from the backend directory):
  python -m migrations.migrate_purchase_price_per_box
"""
from sqlalchemy import text

from app import models  # noqa: F401 - registers all tables on Base.metadata
from app.database import engine


def _line_grand(qty_or_boxes: float, price: float, discount: float, gst: float, inc_gst: bool) -> float:
    gross = qty_or_boxes * price
    net = gross * (1 - discount / 100)
    taxable = net / (1 + gst / 100) if inc_gst else net
    taxable = round(taxable, 2)
    gst_amt = round(taxable * gst / 100, 2)
    return round(taxable + gst_amt, 2)


def migrate():
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT pi.id,
                       pi.quantity,
                       pi.purchase_price,
                       pi.discount_percent,
                       pi.gst_percent,
                       pi.price_inc_gst,
                       pi.grand_amount,
                       COALESCE(pd.qty_per_box, 1) AS qty_per_box
                FROM purchase_items pi
                LEFT JOIN product_details pd ON pd.id = pi.product_detail_id
                """
            )
        ).mappings().all()

        converted = 0
        skipped = 0
        for row in rows:
            qpb = max(int(row["qty_per_box"] or 1), 1)
            qty = float(row["quantity"])
            price = float(row["purchase_price"])
            disc = float(row["discount_percent"] or 0)
            gst = float(row["gst_percent"] or 0)
            inc = bool(row["price_inc_gst"])
            stored = float(row["grand_amount"])

            old_grand = _line_grand(qty, price, disc, gst, inc)
            new_grand = _line_grand(qty / qpb, price, disc, gst, inc)

            # Already on per-box pricing (or qpb=1 where both formulas agree).
            if abs(stored - new_grand) <= 0.05 and abs(stored - old_grand) > 0.05:
                skipped += 1
                continue
            if qpb == 1:
                skipped += 1
                continue
            # Still matches per-piece pricing — convert.
            if abs(stored - old_grand) > 0.05:
                skipped += 1
                continue

            new_price = round(price * qpb, 2)
            conn.execute(
                text("UPDATE purchase_items SET purchase_price = :price WHERE id = :id"),
                {"price": new_price, "id": row["id"]},
            )
            converted += 1

        print(f"Converted {converted} purchase line(s) to per-box price; skipped {skipped}.")


if __name__ == "__main__":
    migrate()
