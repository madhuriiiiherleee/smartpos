from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import (
    Category,
    Customer,
    CustomerPayment,
    CustomerRoute,
    FinancialYear,
    PackingSize,
    Product,
    ProductDetail,
    PurchaseItem,
    Sale,
    SaleItem,
    SalesOrder,
    SalesOrderItem,
    Vendor,
)
from app.numbering import financial_year_bounds, financial_year_label
from app.schemas_master import (
    ActiveToggle,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    CustomerMasterCreate,
    CustomerMasterRead,
    CustomerMasterUpdate,
    FinancialYearCreate,
    FinancialYearRead,
    PackingSizeCreate,
    PackingSizeRead,
    PackingSizeUpdate,
    ProductCreate,
    ProductDetailCreate,
    ProductDetailRead,
    ProductDetailUpdate,
    ProductRead,
    ProductUpdate,
    ProductWithDetailCreate,
    VendorCreate,
    VendorRead,
    VendorUpdate,
)

router = APIRouter(prefix="/api/master", tags=["master-settings"])


def _get_or_404(db: Session, model, id: int):
    obj = db.get(model, id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return obj


def _commit(db: Session, obj, duplicate_field: str):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(exc.orig, "sqlstate", None) == "23505":
            detail = f"{duplicate_field} already exists"
        else:
            detail = "Could not save — please check the values and try again"
        raise HTTPException(status_code=400, detail=detail) from exc
    db.refresh(obj)
    return obj


# ---------------- Category ----------------


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(q: str | None = None, active: bool | None = None, db: Session = Depends(get_db)):
    stmt = select(Category)
    if q:
        stmt = stmt.where(or_(Category.name.ilike(f"%{q}%"), Category.code.ilike(f"%{q}%")))
    if active is not None:
        stmt = stmt.where(Category.active == active)
    stmt = stmt.order_by(Category.name)
    return db.execute(stmt).scalars().all()


@router.post("/categories", response_model=CategoryRead, status_code=201)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    obj = Category(**payload.model_dump())
    db.add(obj)
    return _commit(db, obj, "Category code")


@router.put("/categories/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, payload: CategoryUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Category, category_id)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    return _commit(db, obj, "Category code")


@router.patch("/categories/{category_id}/active", response_model=CategoryRead)
def toggle_category_active(category_id: int, payload: ActiveToggle, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Category, category_id)
    obj.active = payload.active
    return _commit(db, obj, "Category code")


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Category, category_id)
    in_use = db.query(Product).filter(Product.category_id == category_id).first()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="This category is in use by existing products and cannot be deleted. Deactivate it instead.",
        )
    db.delete(obj)
    db.commit()


# ---------------- Packing Size ----------------


def _packing_size_label(value: float | None, unit: str) -> str:
    unit = unit.strip()
    if value is None:
        return unit
    text = f"{value:.3f}".rstrip("0").rstrip(".")
    return f"{text} {unit}".strip()


@router.get("/packing-sizes", response_model=list[PackingSizeRead])
def list_packing_sizes(q: str | None = None, active: bool | None = None, db: Session = Depends(get_db)):
    stmt = select(PackingSize)
    if q:
        stmt = stmt.where(or_(PackingSize.label.ilike(f"%{q}%"), PackingSize.unit.ilike(f"%{q}%")))
    if active is not None:
        stmt = stmt.where(PackingSize.active == active)
    stmt = stmt.order_by(PackingSize.unit, PackingSize.value)
    return db.execute(stmt).scalars().all()


@router.post("/packing-sizes", response_model=PackingSizeRead, status_code=201)
def create_packing_size(payload: PackingSizeCreate, db: Session = Depends(get_db)):
    obj = PackingSize(
        value=payload.value,
        unit=payload.unit,
        active=payload.active,
        label=_packing_size_label(payload.value, payload.unit),
    )
    db.add(obj)
    return _commit(db, obj, "Packing size")


@router.put("/packing-sizes/{packing_size_id}", response_model=PackingSizeRead)
def update_packing_size(packing_size_id: int, payload: PackingSizeUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, PackingSize, packing_size_id)
    obj.value = payload.value
    obj.unit = payload.unit
    obj.active = payload.active
    obj.label = _packing_size_label(payload.value, payload.unit)
    return _commit(db, obj, "Packing size")


@router.patch("/packing-sizes/{packing_size_id}/active", response_model=PackingSizeRead)
def toggle_packing_size_active(packing_size_id: int, payload: ActiveToggle, db: Session = Depends(get_db)):
    obj = _get_or_404(db, PackingSize, packing_size_id)
    obj.active = payload.active
    return _commit(db, obj, "Packing size")


@router.delete("/packing-sizes/{packing_size_id}", status_code=204)
def delete_packing_size(packing_size_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, PackingSize, packing_size_id)
    in_use = db.query(ProductDetail).filter(ProductDetail.packing_size_id == packing_size_id).first()
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="This packing size is used by existing products and cannot be deleted. Deactivate it instead.",
        )
    db.delete(obj)
    db.commit()


# ---------------- Product ----------------


def _product_read(product: Product) -> ProductRead:
    data = ProductRead.model_validate(product)
    data.category_name = product.category.name if product.category else None
    details = sorted(product.details, key=lambda d: d.id)
    data.pack_size_count = len(details)
    if details:
        primary = details[0]
        data.wholesale_price = float(primary.rate_per_unit)
        data.retail_price_amount = float(primary.retail_price)
        data.mrp_amount = float(primary.mrp)
    return data


@router.get("/products", response_model=list[ProductRead])
def list_products(
    q: str | None = None,
    category_id: int | None = None,
    active: bool | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Product).options(selectinload(Product.details))
    if q:
        stmt = stmt.where(or_(Product.name.ilike(f"%{q}%"), Product.code.ilike(f"%{q}%")))
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if active is not None:
        stmt = stmt.where(Product.active == active)
    stmt = stmt.order_by(Product.name)
    products = db.execute(stmt).scalars().all()
    return [_product_read(p) for p in products]


@router.post("/products", response_model=ProductRead, status_code=201)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    obj = Product(**payload.model_dump())
    db.add(obj)
    _commit(db, obj, "Product code")
    return _product_read(obj)


@router.post("/products/with-detail", response_model=ProductRead, status_code=201)
def create_product_with_detail(payload: ProductWithDetailCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    detail_fields = {
        key: data.pop(key)
        for key in ("packing_size_id", "qty_per_box", "rate_per_unit", "retail_price", "mrp")
    }
    product = Product(**data)
    db.add(product)
    db.flush()
    db.add(ProductDetail(product_id=product.id, code=payload.code, **detail_fields))
    _commit(db, product, "Code")
    return _product_read(product)


@router.put("/products/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Product, product_id)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    _commit(db, obj, "Product code")
    return _product_read(obj)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Product, product_id)
    in_use = (
        db.query(PurchaseItem).filter(PurchaseItem.product_id == product_id).first()
        or db.query(SaleItem).filter(SaleItem.product_id == product_id).first()
        or db.query(SalesOrderItem).filter(SalesOrderItem.product_id == product_id).first()
    )
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="This product has existing purchases, sales, or orders and cannot be deleted. Deactivate it instead.",
        )
    for detail in list(obj.details):
        db.delete(detail)
    db.delete(obj)
    db.commit()


@router.patch("/products/{product_id}/active", response_model=ProductRead)
def toggle_product_active(product_id: int, payload: ActiveToggle, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Product, product_id)
    obj.active = payload.active
    _commit(db, obj, "Product code")
    return _product_read(obj)


# ---------------- Product Detail ----------------


def _product_detail_read(detail: ProductDetail) -> ProductDetailRead:
    data = ProductDetailRead.model_validate(detail)
    data.product_name = detail.product.name if detail.product else None
    data.packing_size = detail.packing_size_ref.label if detail.packing_size_ref else None
    return data


@router.get("/product-details", response_model=list[ProductDetailRead])
def list_product_details(
    q: str | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(ProductDetail)
    if product_id is not None:
        stmt = stmt.where(ProductDetail.product_id == product_id)
    if category_id is not None or q:
        stmt = stmt.join(Product, Product.id == ProductDetail.product_id)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if q:
        # Match either the pack's own code or the parent product's barcode/code,
        # since a product's code can be edited without updating its pack codes.
        stmt = stmt.where(or_(ProductDetail.code.ilike(f"%{q}%"), Product.code.ilike(f"%{q}%")))
    stmt = stmt.order_by(ProductDetail.code)
    details = db.execute(stmt).scalars().all()
    return [_product_detail_read(d) for d in details]


@router.post("/product-details", response_model=ProductDetailRead, status_code=201)
def create_product_detail(payload: ProductDetailCreate, db: Session = Depends(get_db)):
    obj = ProductDetail(**payload.model_dump())
    db.add(obj)
    _commit(db, obj, "Code")
    return _product_detail_read(obj)


@router.put("/product-details/{detail_id}", response_model=ProductDetailRead)
def update_product_detail(detail_id: int, payload: ProductDetailUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, ProductDetail, detail_id)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    _commit(db, obj, "Code")
    return _product_detail_read(obj)


# ---------------- Vendor ----------------


@router.get("/vendors", response_model=list[VendorRead])
def list_vendors(q: str | None = None, active: bool | None = None, db: Session = Depends(get_db)):
    stmt = select(Vendor)
    if q:
        stmt = stmt.where(Vendor.name.ilike(f"%{q}%"))
    if active is not None:
        stmt = stmt.where(Vendor.active == active)
    stmt = stmt.order_by(Vendor.name)
    return db.execute(stmt).scalars().all()


@router.post("/vendors", response_model=VendorRead, status_code=201)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    obj = Vendor(**payload.model_dump())
    db.add(obj)
    return _commit(db, obj, "Vendor")


@router.put("/vendors/{vendor_id}", response_model=VendorRead)
def update_vendor(vendor_id: int, payload: VendorUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Vendor, vendor_id)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    return _commit(db, obj, "Vendor")


@router.patch("/vendors/{vendor_id}/active", response_model=VendorRead)
def toggle_vendor_active(vendor_id: int, payload: ActiveToggle, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Vendor, vendor_id)
    obj.active = payload.active
    return _commit(db, obj, "Vendor")


# ---------------- Customer (master) ----------------


@router.get("/customers", response_model=list[CustomerMasterRead])
def list_customers(q: str | None = None, active: bool | None = None, db: Session = Depends(get_db)):
    stmt = select(Customer)
    if q:
        stmt = stmt.where(Customer.name.ilike(f"%{q}%"))
    if active is not None:
        stmt = stmt.where(Customer.active == active)
    stmt = stmt.order_by(Customer.name)
    return db.execute(stmt).scalars().all()


@router.post("/customers", response_model=CustomerMasterRead, status_code=201)
def create_customer(payload: CustomerMasterCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    routes = data.pop("routes")
    obj = Customer(**data)
    db.add(obj)
    db.flush()
    for route in routes:
        db.add(CustomerRoute(customer_id=obj.id, **route))
    return _commit(db, obj, "Customer")


@router.delete("/customers/{customer_id}", status_code=204)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Customer, customer_id)
    in_use = (
        db.query(Sale).filter(Sale.customer_id == customer_id).first()
        or db.query(SalesOrder).filter(SalesOrder.customer_id == customer_id).first()
        or db.query(CustomerPayment).filter(CustomerPayment.customer_id == customer_id).first()
    )
    if in_use:
        raise HTTPException(
            status_code=400,
            detail="This customer has existing sales, orders, or payments and cannot be deleted. Deactivate it instead.",
        )
    db.delete(obj)
    db.commit()


@router.put("/customers/{customer_id}", response_model=CustomerMasterRead)
def update_customer(customer_id: int, payload: CustomerMasterUpdate, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Customer, customer_id)
    data = payload.model_dump()
    routes = data.pop("routes")
    for key, value in data.items():
        setattr(obj, key, value)
    for existing in list(obj.routes):
        db.delete(existing)
    db.flush()
    for route in routes:
        db.add(CustomerRoute(customer_id=obj.id, **route))
    return _commit(db, obj, "Customer")


@router.patch("/customers/{customer_id}/active", response_model=CustomerMasterRead)
def toggle_customer_active(customer_id: int, payload: ActiveToggle, db: Session = Depends(get_db)):
    obj = _get_or_404(db, Customer, customer_id)
    obj.active = payload.active
    return _commit(db, obj, "Customer")


# ---------------- Financial Year ----------------


def _financial_year_read(fy: FinancialYear) -> FinancialYearRead:
    start_date, end_date = financial_year_bounds(fy.start_year)
    return FinancialYearRead(
        id=fy.id,
        label=fy.label,
        start_year=fy.start_year,
        is_active=fy.is_active,
        start_date=start_date,
        end_date=end_date,
    )


def _activate_financial_year(db: Session, fy: FinancialYear):
    db.execute(update(FinancialYear).where(FinancialYear.is_active == True).values(is_active=False))  # noqa: E712
    db.flush()
    fy.is_active = True
    db.flush()


@router.get("/financial-years", response_model=list[FinancialYearRead])
def list_financial_years(db: Session = Depends(get_db)):
    years = db.execute(select(FinancialYear).order_by(FinancialYear.start_year)).scalars().all()
    return [_financial_year_read(fy) for fy in years]


@router.post("/financial-years", response_model=FinancialYearRead, status_code=201)
def create_financial_year(payload: FinancialYearCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(FinancialYear).where(FinancialYear.start_year == payload.start_year)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Financial year already exists")

    obj = FinancialYear(
        label=financial_year_label(payload.start_year),
        start_year=payload.start_year,
        is_active=False,
    )
    db.add(obj)
    db.flush()
    if payload.make_active:
        _activate_financial_year(db, obj)
    db.commit()
    db.refresh(obj)
    return _financial_year_read(obj)


@router.patch("/financial-years/{financial_year_id}/activate", response_model=FinancialYearRead)
def activate_financial_year(financial_year_id: int, db: Session = Depends(get_db)):
    obj = _get_or_404(db, FinancialYear, financial_year_id)
    _activate_financial_year(db, obj)
    db.commit()
    db.refresh(obj)
    return _financial_year_read(obj)
