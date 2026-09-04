import random
from datetime import date

from app.auth import hash_password
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (
    Category,
    Customer,
    CustomerPayment,
    PackingSize,
    Product,
    ProductDetail,
    Purchase,
    Sale,
    SalesOrder,
    User,
    Vendor,
)

MONTHLY_SALES = [42000, 38500, 51000, 47500, 60200, 55800, 62500, 58900, 71200, 66400, 74800, 82300]
MONTHLY_PURCHASE = [30500, 28900, 39800, 36200, 45100, 41300, 48900, 44200, 53600, 49800, 56200, 61900]

CUSTOMERS = [
    ("Rahim Traders", 12500.00),
    ("Nova Electronics", -3200.50),
    ("Green Valley Mart", 8750.00),
    ("City Hardware Co.", 0.00),
    ("Prime Foods Ltd.", -1450.75),
    ("Sunrise Textiles", 21300.00),
    ("Blue Ocean Supplies", 640.25),
    ("Metro Stationers", -890.00),
]

CATEGORIES = [
    ("CAT-ELEC", "Electronics"),
    ("CAT-GROC", "Groceries"),
    ("CAT-STAT", "Stationery"),
    ("CAT-TEXT", "Textiles"),
]

PRODUCTS = [
    ("CAT-ELEC", "PRD-1001", "LED Bulb 9W", "Energy-saving LED bulb, 9 watt, cool white"),
    ("CAT-ELEC", "PRD-1002", "Extension Board", "6-socket extension board with surge protector"),
    ("CAT-GROC", "PRD-2001", "Basmati Rice 5kg", "Premium long-grain basmati rice, 5kg pack"),
    ("CAT-STAT", "PRD-3001", "A4 Copier Paper", "75 GSM A4 size copier paper, ream of 500"),
    ("CAT-TEXT", "PRD-4001", "Cotton Bedsheet", "Double bed cotton bedsheet with 2 pillow covers"),
]

VENDORS = [
    ("Om Distributors", "Rakesh Sharma", "9876543210", "sales@omdist.com", "GSTIN29ABCDE1234F1Z5"),
    ("Vertex Supplies", "Anita Verma", "9823456781", "info@vertexsupplies.com", "GSTIN27PQRSX5678K1Z2"),
    ("Sunshine Wholesale", "Manoj Nair", "9845123467", "contact@sunshinewh.com", "GSTIN33LMNOP9012Q1Z8"),
]


def seed_transactions(db):
    if db.query(Purchase).first():
        print("Transaction data already seeded, skipping.")
        return

    year = date.today().year
    for month in range(1, 13):
        db.add(
            Sale(
                invoice_no=f"INV-S{year}{month:02d}",
                sale_date=date(year, month, 15),
                amount=MONTHLY_SALES[month - 1],
            )
        )
        db.add(
            Purchase(
                invoice_no=f"INV-P{year}{month:02d}",
                purchase_date=date(year, month, 10),
                amount=MONTHLY_PURCHASE[month - 1],
            )
        )

    for i in range(1, 33):
        db.add(
            SalesOrder(
                order_no=f"SO-{year}{i:04d}",
                order_date=date(year, random.randint(1, 12), random.randint(1, 28)),
                amount=random.randint(2000, 15000),
            )
        )

    for name, balance in CUSTOMERS:
        customer = Customer(name=name, business_name=name, balance=balance)
        db.add(customer)
        db.flush()
        if balance != 0:
            db.add(
                CustomerPayment(
                    customer_id=customer.id,
                    payment_date=date(year, random.randint(1, 12), random.randint(1, 28)),
                    amount=abs(balance) / 2,
                )
            )

    db.commit()
    print("Transaction data inserted.")


def seed_master_data(db):
    if db.query(Category).first():
        print("Master data already seeded, skipping.")
        return

    category_by_code = {}
    for code, name in CATEGORIES:
        category = Category(code=code, name=name)
        db.add(category)
        db.flush()
        category_by_code[code] = category

    unit_packing_size = PackingSize(value=1, unit="Unit", label="1 Unit")
    db.add(unit_packing_size)
    db.flush()

    for category_code, code, name, description in PRODUCTS:
        product = Product(
            category_id=category_by_code[category_code].id,
            code=code,
            name=name,
            description=description,
        )
        db.add(product)
        db.flush()
        db.add(
            ProductDetail(
                product_id=product.id,
                code=f"SKU-{code}",
                packing_size_id=unit_packing_size.id,
                qty_per_box=random.choice([12, 24, 48]),
                rate_per_unit=round(random.uniform(50, 500), 2),
                retail_price=round(random.uniform(500, 1500), 2),
                mrp=round(random.uniform(1500, 2500), 2),
            )
        )

    for name, contact_person, phone, email, gst in VENDORS:
        db.add(
            Vendor(
                name=name,
                contact_person=contact_person,
                phone=phone,
                email=email,
                gst_number=gst,
            )
        )

    db.commit()
    print("Master data inserted.")


def seed_users(db):
    if db.query(User).first():
        print("Users already seeded, skipping.")
        return

    if not settings.admin_password:
        raise RuntimeError(
            "ADMIN_PASSWORD is not set. Set ADMIN_USERNAME and ADMIN_PASSWORD in .env before seeding — "
            "no default admin password is baked into source."
        )

    db.add(User(username=settings.admin_username, password_hash=hash_password(settings.admin_password)))
    db.commit()
    print(f"Default user created: {settings.admin_username}")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_transactions(db)
        seed_master_data(db)
        seed_users(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
