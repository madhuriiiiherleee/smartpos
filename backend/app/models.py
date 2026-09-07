from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class PackingSize(Base):
    __tablename__ = "packing_sizes"

    id: Mapped[int] = mapped_column(primary_key=True)
    value: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    unit: Mapped[str] = mapped_column(String(30))
    label: Mapped[str] = mapped_column(String(80), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    details: Mapped[list["ProductDetail"]] = relationship(back_populates="packing_size_ref")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    hsn_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cgst_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    sgst_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["Category"] = relationship(back_populates="products")
    details: Mapped[list["ProductDetail"]] = relationship(back_populates="product")


class ProductDetail(Base):
    __tablename__ = "product_details"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    code: Mapped[str] = mapped_column(String(30), unique=True)
    packing_size_id: Mapped[int] = mapped_column(ForeignKey("packing_sizes.id"))
    qty_per_box: Mapped[int] = mapped_column(Integer)
    rate_per_unit: Mapped[float] = mapped_column(Numeric(12, 2))
    retail_price: Mapped[float] = mapped_column(Numeric(12, 2))
    mrp: Mapped[float] = mapped_column(Numeric(12, 2))

    product: Mapped["Product"] = relationship(back_populates="details")
    packing_size_ref: Mapped["PackingSize"] = relationship(back_populates="details")


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    contact_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompanyProfile(Base):
    __tablename__ = "company_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_name: Mapped[str] = mapped_column(String(150), default="")
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    website: Mapped[str | None] = mapped_column(String(150), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    contact_no_1: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_no_2: Mapped[str | None] = mapped_column(String(30), nullable=True)
    logo_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    account_holder_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(150), nullable=True)
    invoice_declaration: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class FinancialYear(Base):
    __tablename__ = "financial_years"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(20), unique=True)
    start_year: Mapped[int] = mapped_column(SmallInteger, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_financial_years_one_active", "is_active", unique=True, postgresql_where=(is_active == True)),  # noqa: E712
    )


class DocumentSeriesCounter(Base):
    """Shared FY-scoped counter for every numbered document series
    (purchase, sales, sales_order, sales_return) — see app/numbering.py."""

    __tablename__ = "purchase_series_counters"

    id: Mapped[int] = mapped_column(primary_key=True)
    series_key: Mapped[str] = mapped_column(String(30), default="purchase")
    financial_year_id: Mapped[int] = mapped_column(ForeignKey("financial_years.id"))
    next_number: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_purchase_series_counters_unique", "series_key", "financial_year_id", unique=True),
    )


class Purchase(Base):
    __tablename__ = "purchases"
    __table_args__ = (UniqueConstraint("supplier_id", "invoice_no", name="uq_purchase_supplier_invoice"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_no: Mapped[str] = mapped_column(String(50))
    purchase_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))

    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    invoice_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    taxable_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    gst_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    tcs: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    round_off: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    financial_year_id: Mapped[int | None] = mapped_column(ForeignKey("financial_years.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supplier: Mapped["Vendor"] = relationship()
    items: Mapped[list["PurchaseItem"]] = relationship(back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("purchases.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_detail_id: Mapped[int | None] = mapped_column(ForeignKey("product_details.id"), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer)
    purchase_price: Mapped[float] = mapped_column(Numeric(12, 2))
    price_inc_gst: Mapped[bool] = mapped_column(Boolean, default=False)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    gst_percent: Mapped[float] = mapped_column(Numeric(5, 2))
    is_igst: Mapped[bool] = mapped_column(Boolean, default=False)
    cgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    sgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    igst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    taxable_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    grand_amount: Mapped[float] = mapped_column(Numeric(12, 2))

    purchase: Mapped["Purchase"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    product_detail: Mapped["ProductDetail | None"] = relationship()


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_no: Mapped[str] = mapped_column(String(50))
    order_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    sales_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    financial_year_id: Mapped[int | None] = mapped_column(ForeignKey("financial_years.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer | None"] = relationship()
    items: Mapped[list["SalesOrderItem"]] = relationship(back_populates="sales_order", cascade="all, delete-orphan")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(ForeignKey("sales_orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    quantity: Mapped[int] = mapped_column(Integer)

    sales_order: Mapped["SalesOrder"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()


SELLING_PRICE_TYPES = ("Wholesale", "Retail", "MRP")


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_no: Mapped[str] = mapped_column(String(50))
    sale_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))

    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"), nullable=True)
    selling_price_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    route: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state_of_supply: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sales_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    shipping_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    shipping_address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipping_pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    delivery_mode: Mapped[str | None] = mapped_column(String(30), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(20), default="Pending")
    delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    taxable_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    gst_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    discount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    financial_year_id: Mapped[int | None] = mapped_column(ForeignKey("financial_years.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer | None"] = relationship()
    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_detail_id: Mapped[int | None] = mapped_column(ForeignKey("product_details.id"), nullable=True)

    quantity: Mapped[int] = mapped_column(Integer)
    free_quantity: Mapped[int] = mapped_column(Integer, default=0)
    uom: Mapped[str] = mapped_column(String(20), default="UNIT")
    price: Mapped[float] = mapped_column(Numeric(12, 2))
    price_inc_gst: Mapped[bool] = mapped_column(Boolean, default=False)
    discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    gst_percent: Mapped[float] = mapped_column(Numeric(5, 2))
    is_igst: Mapped[bool] = mapped_column(Boolean, default=False)
    cgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    sgst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    igst_amount: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    taxable_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    grand_amount: Mapped[float] = mapped_column(Numeric(12, 2))

    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    product_detail: Mapped["ProductDetail | None"] = relationship()


class SalesReturn(Base):
    __tablename__ = "sales_returns"

    id: Mapped[int] = mapped_column(primary_key=True)
    return_no: Mapped[str] = mapped_column(String(50), unique=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id"))
    return_date: Mapped[date] = mapped_column(Date)
    taxable_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    financial_year_id: Mapped[int | None] = mapped_column(ForeignKey("financial_years.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sale: Mapped["Sale"] = relationship()
    items: Mapped[list["SalesReturnItem"]] = relationship(back_populates="sales_return", cascade="all, delete-orphan")


class SalesReturnItem(Base):
    __tablename__ = "sales_return_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sales_return_id: Mapped[int] = mapped_column(ForeignKey("sales_returns.id"))
    sale_item_id: Mapped[int] = mapped_column(ForeignKey("sale_items.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    taxable_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    gst_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    grand_amount: Mapped[float] = mapped_column(Numeric(12, 2))

    sales_return: Mapped["SalesReturn"] = relationship(back_populates="items")
    sale_item: Mapped["SaleItem"] = relationship()


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    business_name: Mapped[str] = mapped_column(String(150))
    margin: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    contact_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    mobile_number_2: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    selling_price_type: Mapped[str] = mapped_column(String(20), default="Retail")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    payments: Mapped[list["CustomerPayment"]] = relationship(back_populates="customer")
    routes: Mapped[list["CustomerRoute"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class CustomerRoute(Base):
    __tablename__ = "customer_routes"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    route_name: Mapped[str] = mapped_column(String(150))
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    customer: Mapped["Customer"] = relationship(back_populates="routes")


class CustomerPayment(Base):
    __tablename__ = "customer_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    payment_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))

    customer: Mapped["Customer"] = relationship(back_populates="payments")
