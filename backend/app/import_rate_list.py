"""
One-off cleanup + import: removes the placeholder demo master/transaction
data (LED Bulb / Extension Board / Basmati Rice / A4 Copier Paper / Cotton
Bedsheet and everything that referenced them) and loads the real ice-cream
rate list (Category -> Product -> ProductDetail).

TCD Rate from the source rate list is stored in ProductDetail.rate_per_unit
(the field the app already treats as the wholesale/purchase price). The
sheet's own "Rate Per Unit" (MRP / Qty per Box) column is intentionally not
imported.

Run once: python -m app.import_rate_list
"""
import re

from app.database import SessionLocal
from app.models import (
    Category,
    PackingSize,
    Product,
    ProductDetail,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    SalesOrder,
    SalesOrderItem,
    SalesReturn,
)

DEMO_CATEGORY_CODES = ["CAT-ELEC", "CAT-GROC", "CAT-STAT", "CAT-TEXT"]
DEMO_PRODUCT_CODES = ["PRD-1001", "PRD-1002", "PRD-2001", "PRD-3001", "PRD-4001"]

# (name, size_ml, qty_per_box, retailer_price, mrp, tcd_rate)
CUP = [
    ("VANILLA CUP", 30, 24, 96, 120, 84.95),
    ("STRAWBERRY CUP", 30, 24, 96, 120, 94.95),
    ("GREEN PISTA CUP", 30, 24, 92.31, 120, 81.71),
    ("PINE APPLE CUP", 30, 24, 92.31, 120, 81.71),
    ("VANILLA CUP", 55, 16, 128, 160, 113.28),
    ("STRAWBERRY CUP", 55, 16, 128, 160, 113.28),
    ("PINE APPLE CUP", 55, 16, 128, 160, 113.28),
    ("GREEN PISTA CUP", 55, 16, 128, 160, 113.28),
    ("MANGO CUP", 55, 16, 184.62, 240, 163.37),
    ("BUTTER SCOTCH CUP", 55, 16, 192, 240, 169.92),
    ("VANILLA CUP", 100, 8, 160, 200, 141.59),
    ("STRAWBERRY CUP", 100, 8, 160, 200, 141.59),
    ("PINE APPLE CUP", 100, 8, 160, 200, 141.59),
    ("BUTTER SCOTCH CUP", 100, 8, 160, 200, 141.59),
    ("CHICKOO CUP", 100, 8, 192, 240, 169.92),
    ("JACK FRUIT CUP", 100, 8, 224, 280, 198.24),
    ("PINK GUAVA CUP", 100, 8, 215.38, 280, 190.61),
    ("LYCHEE CUP", 100, 8, 224, 280, 190.61),
    ("MANGO CUP", 100, 8, 224, 280, 198.24),
    ("SEETHAPHAL CUP", 100, 8, 256, 320, 226.54),
    ("TENDER COCONUT CUP", 100, 8, 320, 400, 283.18),
    ("ZAFRANI BADAM PISTA CUP", 100, 8, 246.15, 320, 217.84),
]

CONE = [
    ("VANILLA CONE", 40, 20, 240, 300, 212.39),
    ("STRAWBERRY CONE", 40, 20, 240, 300, 212.39),
    ("BUTTER SCOTCH CONE", 40, 20, 240, 300, 212.39),
    ("GREEN PISTA CONE", 40, 20, 240, 300, 212.39),
    ("CHOCOLATE CONE", 40, 20, 240, 300, 212.39),
    ("STRAWBERRY CONE", 120, 20, 480, 600, 424.77),
    ("BLACK CURRANT CONE", 120, 20, 480, 600, 424.77),
    ("VANILLA CONE", 120, 20, 480, 600, 424.77),
    ("BUTTER SCOTCH CONE", 120, 20, 480, 600, 424.77),
    ("GREEN PISTA CONE", 120, 20, 480, 600, 424.77),
    ("CHOCOLATE CONE", 120, 20, 640, 800, 566.38),
]

NOVELTIES = [
    ("GUDBUD", 100, 8, 184.62, 240, 163.37),
    ("MATKA KULFI", 100, 1, 36, 45, 31.86),
    ("VANILLA BALL", 100, 12, 184.62, 240, 163.37),
    ("STRAWBERRY BALL", 100, 12, 203.08, 264, 179.72),
    ("MANGO 2 IN 1 SUNDAE", 125, 6, 168, 210, 148.67),
    ("NOVELTY SUNDAE", 125, 6, 161.53, 210, 142.94),
    ("STRAWBERRY SUNDAE", 125, 6, 168, 210, 148.67),
    ("CHOCOLATE SUNDAE", 125, 6, 161.53, 210, 142.94),
    ("NANDINI CASSATA", 125, 10, 439.9984, 550, 389.38),
]

CANDY = [
    ("GRAPE CANDY", 50, 24, 96, 120, 84.95),
    ("MANGO CANDY", 50, 24, 96, 120, 84.95),
    ("ORANGE CANDY", 50, 24, 92.31, 120, 81.71),
    ("WATER MELON CANDY", 50, 24, 192, 240, 169.92),
    ("MANGO DOLLY", 60, 14, 224, 280, 198.24),
    ("RASBERRY DOLLY", 60, 14, 224, 280, 198.24),
    ("JUNIOR CHOCOBAR", 40, 18, 144, 180, 121.36),
    ("CHOCOLATE CHOCOBAR", 60, 14, 224, 280, 198.24),
    ("CHOCOBAR", 60, 14, 224, 280, 198.24),
    ("NUTTY CHOCOBAR", 60, 14, 280, 350, 247.78),
    ("BUTTER SCOTCH CHOCOBAR", 60, 14, 280, 350, 188.8),
    ("PISTA KULFI", 30, 18, 216, 270, 191.14),
    ("KESAR KULFI", 30, 18, 216, 270, 191.14),
    ("RAJBHOG KULFI", 30, 18, 216, 270, 191.14),
    ("KULFI BADAM", 30, 18, 216, 270, 191.14),
]

# last field: optional sku suffix override, used only for the Mango/750
# BOGO conflict (same product+size, different qty_per_box/pricing)
TUBS = [
    ("BUTTER SCOTCH TUB", 500, 1, 88, 110, 77.87, None),
    ("VANILLA TUB", 500, 1, 80, 100, 70.8, None),
    ("MANGO TUB", 500, 1, 88, 110, 77.87, None),
    ("CHOCOLATE TUB", 500, 1, 88, 110, 77.87, None),
    ("TAJ TUB", 500, 1, 120, 150, 106.2, None),
    ("CRUNCHY ORANGE TUB", 500, 1, 120, 150, 106.2, None),
    ("CHICKOO TUB", 750, 1, 146.15, 190, 129.34, None),
    ("JACK FRUIT TUB", 750, 1, 160, 200, 141.59, None),
    ("MANGO TUB", 750, 1, 153.85, 200, 136.14, None),
    ("SEETHAPHAL TUB", 750, 1, 192.31, 250, 170.81, None),
    ("TENDER COCONUT TUB", 750, 1, 246.15, 320, 217.84, None),
    ("PINK GUAVA TUB", 750, 1, 161.53, 210, 142.95, None),
    ("LYCHEE TUB", 750, 1, 169.24, 220, 149.77, None),
    ("BUTTER SCOTCH TUB", 1000, 1, 184.62, 240, 163.37, None),
    ("VANILLA TUB", 1000, 1, 153.85, 200, 136.14, None),
    ("MAVA MALAI KULFI TUB", 1000, 1, 192.31, 250, 170.18, None),
    ("RAJ BHOG TUB", 1000, 1, 192.31, 250, 136.14, None),
    ("AMERICAN NUTS TUB", 1000, 1, 200, 250, 176.99, None),
    ("MELLOW JELLOW TUB", 1000, 1, 200, 250, 176.99, None),
    ("PINE APPLE TUB", 1000, 1, 138.46, 180, 136.14, None),
    ("KESAR BADAM TUB", 1000, 1, 192.31, 250, 170.18, None),
    ("KAJU ANJIR TUB", 1000, 1, 200, 250, 176.99, None),
    ("SHAHIBHOG TUB", 1000, 1, 176.92, 230, 156.58, None),
    ("CHEESE ALMOND TUB", 1000, 1, 200, 260, 176.99, None),
    ("TAJ TUB", 1000, 1, 228, 285, 201.76, None),
    ("CRUNCHY ORANGE TUB", 1000, 1, 228, 285, 201.76, None),
    ("BUTTER SCOTCH TUB", 1500, 1, 230.77, 300, 204.22, None),
    ("VANILLA TUB", 1500, 1, 215.39, 280, 190.61, None),
    ("PINE APPLE TUB", 1500, 1, 192.31, 250, 170.19, None),
    ("STRAWBERRY TUB", 1500, 1, 192.31, 250, 170.18, None),
    # Buy-1-Get-1 items folded into Tubs (no promotions module)
    ("MELLOW JELLOW TUB", 750, 2, 200, 250, 176.99, None),
    ("MANGO TUB", 750, 2, 200, 250, 176.99, "B2"),
    ("KAJU ANJIR TUB", 750, 2, 224, 280, 198.24, None),
    ("AMERICAN NUTS TUB", 750, 2, 224, 280, 198.24, None),
]

BULK = [
    ("BUTTER SCOTCH BULK", 5000, 1, 550, 715, 486.73),
    ("MANGO BULK", 5000, 1, 538.46, 700, 476.52),
    ("KESAR PISTA BULK", 5000, 1, 765.38, 995, 677.34),
    ("STRAWBERRY BULK", 5000, 1, 500, 650, 442.48),
    ("VANILLA BULK", 5000, 1, 500, 650, 442.49),
    ("GREEN PISTA BULK", 5000, 1, 538.46, 700, 476.52),
    ("MAGIC VANILLA BULK", 5000, 1, 400, 520, 353.98),
    ("MAGIC STRAWBERRY BULK", 5000, 1, 384.62, 500, 340.36),
    ("MAGIC PINE APPLE BULK", 5000, 1, 384.62, 500, 340.36),
    ("CHICKOO NATURAL BULK", 5000, 1, 711.54, 925, 629.67),
    ("MANGO NATURAL BULK", 5000, 1, 776.94, 1010, 687.54),
]

FAMILY = [
    ("VANILLA FP", 500, 1, 72, 90, 63.72),
    ("CHOCOLATE FP", 500, 1, 76.92, 100, 68.07),
    ("STRAWBERRY FP", 1000, 1, 134.62, 175, 119.14),
    ("VANILLA FP", 1000, 1, 140, 175, 123.9),
    ("ANJIR FP", 1250, 1, 200, 250, 176.99),
    ("MANGO FP", 1250, 1, 165.38, 215, 146.35),
    ("BUTTERSCOTCH FP", 1250, 1, 172, 215, 152.2),
    ("CHOCOCHIP FP", 1250, 1, 161.54, 210, 142.95),
    ("BLACK CURRANT FP", 1250, 1, 192.31, 250, 170.18),
]

CATEGORIES = [
    ("CUP", "Cup", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in CUP], {"CUP"}),
    ("CONE", "Cone", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in CONE], {"CONE"}),
    ("NOV", "Novelties", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in NOVELTIES], set()),
    ("CDK", "Candy/Dolly/Chocobar/Kulfi", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in CANDY],
     {"CANDY", "DOLLY", "CHOCOBAR", "KULFI"}),
    ("TUB", "Tubs", TUBS, {"TUB"}),
    ("BLK", "Bulk Pack", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in BULK], {"BULK"}),
    ("FPP", "Family Pack/Paperpack", [(n, s, q, r, m, t, None) for n, s, q, r, m, t in FAMILY], {"FP"}),
]


def slugify(words: list[str]) -> str:
    return "-".join(words)


def product_code_for(cat_code: str, name: str, strip_words: set[str]) -> str:
    tokens = re.sub(r"[^A-Z0-9 ]", "", name.upper()).split()
    stripped = [t for t in tokens if t not in strip_words]
    if not stripped:
        stripped = tokens
    return f"{cat_code}-{slugify(stripped)}"


def cleanup_demo_data(db):
    demo_product_ids = [
        row.id for row in db.query(Product).filter(Product.code.in_(DEMO_PRODUCT_CODES)).all()
    ]
    if not demo_product_ids:
        print("No demo master data found (already cleaned).")
        return

    demo_sale_ids = [
        row.sale_id
        for row in db.query(SaleItem).filter(SaleItem.product_id.in_(demo_product_ids)).all()
    ]
    for sr in db.query(SalesReturn).filter(SalesReturn.sale_id.in_(demo_sale_ids)).all():
        db.delete(sr)
    db.flush()

    for sale in db.query(Sale).filter(Sale.id.in_(demo_sale_ids)).all():
        db.delete(sale)

    demo_order_ids = {
        row.sales_order_id
        for row in db.query(SalesOrderItem).filter(SalesOrderItem.product_id.in_(demo_product_ids)).all()
    }
    for order in db.query(SalesOrder).filter(SalesOrder.id.in_(demo_order_ids)).all():
        db.delete(order)

    demo_purchase_ids = {
        row.purchase_id
        for row in db.query(PurchaseItem).filter(PurchaseItem.product_id.in_(demo_product_ids)).all()
    }
    for purchase in db.query(Purchase).filter(Purchase.id.in_(demo_purchase_ids)).all():
        db.delete(purchase)

    db.flush()

    for detail in db.query(ProductDetail).filter(ProductDetail.product_id.in_(demo_product_ids)).all():
        db.delete(detail)
    for product in db.query(Product).filter(Product.id.in_(demo_product_ids)).all():
        db.delete(product)
    for category in db.query(Category).filter(Category.code.in_(DEMO_CATEGORY_CODES)).all():
        db.delete(category)

    db.commit()
    print("Demo data removed.")


def get_or_create_packing_size(db, cache: dict[int, PackingSize], size_ml: int) -> PackingSize:
    packing_size = cache.get(size_ml)
    if packing_size is None:
        label = f"{size_ml} ML"
        packing_size = db.query(PackingSize).filter(PackingSize.label == label).first()
        if packing_size is None:
            packing_size = PackingSize(value=size_ml, unit="ML", label=label)
            db.add(packing_size)
            db.flush()
        cache[size_ml] = packing_size
    return packing_size


def import_rate_list(db):
    if db.query(Category).filter(Category.code == "CUP").first():
        print("Rate list already imported, skipping.")
        return

    detail_count = 0
    product_count = 0
    packing_size_cache: dict[int, PackingSize] = {}

    for cat_code, cat_name, items, strip_words in CATEGORIES:
        category = Category(code=cat_code, name=cat_name)
        db.add(category)
        db.flush()

        product_by_code: dict[str, Product] = {}

        for name, size_ml, qty_box, retail, mrp, tcd, sku_suffix in items:
            code = product_code_for(cat_code, name, strip_words)
            existing = product_by_code.get(code)
            # Two names can strip to the same code (e.g. "MANGO CANDY" and
            # "MANGO DOLLY" both -> CDK-MANGO). Never merge distinct products —
            # fall back to the full name so each SKU keeps its own product row.
            if existing is not None and existing.name != name.title():
                code = f"{cat_code}-{re.sub(r'[^A-Z0-9 ]', '', name.upper()).strip().replace(' ', '-')}"
            product = product_by_code.get(code)
            if product is None:
                product = Product(
                    category_id=category.id,
                    code=code,
                    name=name.title(),
                )
                db.add(product)
                db.flush()
                product_by_code[code] = product
                product_count += 1

            detail_code = f"{code}-{size_ml:04d}"
            if sku_suffix:
                detail_code = f"{detail_code}-{sku_suffix}"

            packing_size = get_or_create_packing_size(db, packing_size_cache, size_ml)
            db.add(
                ProductDetail(
                    product_id=product.id,
                    code=detail_code,
                    packing_size_id=packing_size.id,
                    qty_per_box=qty_box,
                    rate_per_unit=tcd,
                    retail_price=retail,
                    mrp=mrp,
                )
            )
            detail_count += 1

    db.commit()
    print(f"Imported {product_count} products, {detail_count} product details across {len(CATEGORIES)} categories.")


def main():
    db = SessionLocal()
    try:
        cleanup_demo_data(db)
        import_rate_list(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
