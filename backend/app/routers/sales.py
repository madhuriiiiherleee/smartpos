import smtplib
from datetime import date
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Customer, ProductDetail, PurchaseItem, Sale, SaleItem, SalesReturn, SalesReturnItem
from app.numbering import peek_next_number, reserve_next_number, resolve_financial_year
from app.schemas_sales import (
    AvailableQuantityResponse,
    DeliveryListItem,
    DeliveryListResponse,
    MarkDeliveredRequest,
    NextNumberResponse,
    SaleCreate,
    SaleItemRead,
    SaleListItem,
    SaleListResponse,
    SaleRead,
    SaleUpdate,
)

router = APIRouter(prefix="/api/sales", tags=["sales"])

SERIES_KEY = "sales"
PREFIX = "INV"


def _available_units(db: Session, product_detail_id: int, exclude_sale_id: int | None = None) -> int:
    """Unit-level running stock for one SKU (ProductDetail): purchased - sold(+free) + returned.

    exclude_sale_id lets an in-progress edit ignore its OWN prior consumption,
    so re-saving a sale with unchanged/reduced quantities isn't blocked by itself."""
    purchased = db.execute(
        select(func.coalesce(func.sum(PurchaseItem.quantity), 0)).where(
            PurchaseItem.product_detail_id == product_detail_id
        )
    ).scalar_one()

    sold_stmt = select(func.coalesce(func.sum(SaleItem.quantity + SaleItem.free_quantity), 0)).where(
        SaleItem.product_detail_id == product_detail_id
    )
    if exclude_sale_id is not None:
        sold_stmt = sold_stmt.where(SaleItem.sale_id != exclude_sale_id)
    sold = db.execute(sold_stmt).scalar_one()

    returned_stmt = (
        select(func.coalesce(func.sum(SalesReturnItem.quantity), 0))
        .select_from(SalesReturnItem)
        .join(SaleItem, SalesReturnItem.sale_item_id == SaleItem.id)
        .where(SaleItem.product_detail_id == product_detail_id)
    )
    if exclude_sale_id is not None:
        returned_stmt = returned_stmt.where(SaleItem.sale_id != exclude_sale_id)
    returned = db.execute(returned_stmt).scalar_one()

    return int(purchased) - int(sold) + int(returned)


def _check_stock(db: Session, items, exclude_sale_id: int | None = None) -> None:
    """Raise 400 if any line requests more units than are currently available for its SKU."""
    needed: dict[int, int] = {}
    for item in items:
        if item.product_detail_id is None:
            continue
        needed[item.product_detail_id] = needed.get(item.product_detail_id, 0) + item.quantity + getattr(
            item, "free_quantity", 0
        )

    for product_detail_id, requested in needed.items():
        available = _available_units(db, product_detail_id, exclude_sale_id=exclude_sale_id)
        if requested > available:
            detail = db.get(ProductDetail, product_detail_id)
            name = detail.code if detail else f"SKU #{product_detail_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {name}: {requested} pieces requested, only {available} available.",
            )


@router.get("/next-invoice-number", response_model=NextNumberResponse)
def peek_next_invoice_number(sale_date: date | None = None, db: Session = Depends(get_db)):
    number, label = peek_next_number(db, SERIES_KEY, PREFIX, sale_date)
    return NextNumberResponse(number=number, financial_year=label)


@router.get("/routes", response_model=list[str])
def list_routes(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Sale.route).where(Sale.route.isnot(None)).distinct().order_by(Sale.route)
    ).scalars().all()
    return [r for r in rows if r]


@router.get("/available-quantity", response_model=AvailableQuantityResponse)
def get_available_quantity(product_detail_id: int, db: Session = Depends(get_db)):
    return AvailableQuantityResponse(
        product_detail_id=product_detail_id, available_quantity=_available_units(db, product_detail_id)
    )


# ---------------- Sale CRUD ----------------


def _max_customer_price(db: Session, product_detail_id: int, customer_margin: float) -> float | None:
    """Customer Selling Price = MRP - (MRP x Customer Margin / 100) — the ceiling a sale
    line's price must not exceed, so the backend never blindly trusts a frontend-submitted
    price. Returns None if the pack size can't be resolved (nothing to validate against)."""
    detail = db.get(ProductDetail, product_detail_id)
    if detail is None:
        return None
    return round(float(detail.mrp) * (1 - customer_margin / 100), 2)


def _build_sale_items(db: Session, payload_items, customer_margin: float) -> tuple[list[SaleItem], float, float, float]:
    rows: list[SaleItem] = []
    taxable_total = gst_total = grand_total = 0.0
    for item in payload_items:
        if item.product_detail_id is not None:
            max_price = _max_customer_price(db, item.product_detail_id, customer_margin)
            if max_price is not None and item.price > max_price + 0.01:
                detail = db.get(ProductDetail, item.product_detail_id)
                name = detail.code if detail else f"SKU #{item.product_detail_id}"
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Price for {name} ({item.price:.2f}) exceeds this customer's margin-based price "
                        f"of {max_price:.2f} ({customer_margin}% margin off MRP)."
                    ),
                )
        gross = item.quantity * item.price
        net = gross * (1 - item.discount_percent / 100)
        if item.price_inc_gst:
            taxable = net / (1 + item.gst_percent / 100)
        else:
            taxable = net
        taxable = round(taxable, 2)
        gst = round(taxable * item.gst_percent / 100, 2)
        grand = round(taxable + gst, 2)

        if item.is_igst:
            cgst, sgst, igst = 0.0, 0.0, gst
        else:
            cgst = round(gst / 2, 2)
            sgst = round(gst - cgst, 2)
            igst = 0.0

        taxable_total += taxable
        gst_total += gst
        grand_total += grand
        rows.append(
            SaleItem(
                product_id=item.product_id,
                product_detail_id=item.product_detail_id,
                quantity=item.quantity,
                free_quantity=item.free_quantity,
                uom=item.uom,
                price=item.price,
                discount_percent=item.discount_percent,
                gst_percent=item.gst_percent,
                is_igst=item.is_igst,
                cgst_amount=cgst,
                sgst_amount=sgst,
                igst_amount=igst,
                taxable_amount=taxable,
                gst_amount=gst,
                grand_amount=grand,
            )
        )
    return rows, round(taxable_total, 2), round(gst_total, 2), round(grand_total, 2)


def _sale_item_read(db: Session, item: SaleItem) -> SaleItemRead:
    data = SaleItemRead.model_validate(item)
    data.product_code = item.product.code if item.product else None
    data.product_name = item.product.name if item.product else None
    data.hsn_code = item.product.hsn_code if item.product else None
    data.code = item.product_detail.code if item.product_detail else None
    data.packing_size = item.product_detail.packing_size_ref.label if item.product_detail else None
    data.qty_per_box = item.product_detail.qty_per_box if item.product_detail else None
    data.retail_price = float(item.product_detail.retail_price) if item.product_detail else None
    data.returned_quantity = db.execute(
        select(func.coalesce(func.sum(SalesReturnItem.quantity), 0)).where(
            SalesReturnItem.sale_item_id == item.id
        )
    ).scalar_one()
    return data


def _sale_read(db: Session, sale: Sale) -> SaleRead:
    data = SaleRead.model_validate(sale)
    data.customer_name = sale.customer.name if sale.customer else None
    data.items = [_sale_item_read(db, item) for item in sale.items]
    return data


@router.post("", response_model=SaleRead, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    _check_stock(db, payload.items)
    financial_year = resolve_financial_year(db, payload.sale_date)
    invoice_no = reserve_next_number(db, financial_year, SERIES_KEY, PREFIX)
    items, taxable_total, gst_total, grand_total = _build_sale_items(db, payload.items, float(customer.margin))
    final_amount = round(grand_total - payload.discount, 2)

    sale = Sale(
        invoice_no=invoice_no,
        sale_date=payload.sale_date,
        amount=final_amount,
        customer_id=payload.customer_id,
        selling_price_type=payload.selling_price_type,
        route=payload.route,
        state_of_supply=payload.state_of_supply,
        sales_type=payload.sales_type,
        shipping_name=payload.shipping_name,
        shipping_address_line1=payload.shipping_address_line1,
        shipping_address_line2=payload.shipping_address_line2,
        shipping_city=payload.shipping_city,
        shipping_state=payload.shipping_state,
        shipping_pincode=payload.shipping_pincode,
        delivery_mode=payload.delivery_mode,
        taxable_amount=taxable_total,
        gst_amount=gst_total,
        discount=payload.discount,
        financial_year_id=financial_year.id,
        items=items,
    )
    db.add(sale)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save sale — please retry") from exc
    db.refresh(sale)
    return _sale_read(db, sale)


@router.get("", response_model=SaleListResponse)
def list_sales(
    date_from: date | None = None,
    date_to: date | None = None,
    customer_id: int | None = None,
    sales_type: str | None = None,
    q: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    # Excludes legacy dashboard-demo rows (seeded before this module existed,
    # with no customer/line items) — the Dashboard's own aggregate total is a
    # separate query and is intentionally unaffected by this filter.
    stmt = select(Sale).where(Sale.customer_id.isnot(None))
    if date_from:
        stmt = stmt.where(Sale.sale_date >= date_from)
    if date_to:
        stmt = stmt.where(Sale.sale_date <= date_to)
    if customer_id:
        stmt = stmt.where(Sale.customer_id == customer_id)
    if sales_type:
        stmt = stmt.where(Sale.sales_type == sales_type)
    if q:
        stmt = stmt.where(Sale.invoice_no.ilike(f"%{q}%"))

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = stmt.order_by(Sale.sale_date.desc(), Sale.id.desc()).offset((page - 1) * page_size).limit(page_size)
    sales = db.execute(stmt).scalars().all()

    items = [
        SaleListItem(
            id=s.id,
            invoice_no=s.invoice_no,
            sale_date=s.sale_date,
            customer_name=s.customer.name if s.customer else None,
            sales_type=s.sales_type,
            amount=float(s.amount),
        )
        for s in sales
    ]
    return SaleListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/delivery", response_model=DeliveryListResponse)
def list_delivery(
    route: str | None = None,
    delivery_status: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Sale).where(Sale.customer_id.isnot(None))
    if route:
        stmt = stmt.where(Sale.route == route)
    if delivery_status:
        stmt = stmt.where(Sale.delivery_status == delivery_status)
    if q:
        stmt = stmt.where(Sale.invoice_no.ilike(f"%{q}%"))
    stmt = stmt.order_by(Sale.sale_date.desc(), Sale.id.desc())
    sales = db.execute(stmt).scalars().all()

    items = [
        DeliveryListItem(
            id=s.id,
            invoice_no=s.invoice_no,
            customer_name=s.customer.name if s.customer else None,
            delivery_status=s.delivery_status,
            delivery_date=s.delivery_date,
            payment_type=s.sales_type,
            route=s.route,
        )
        for s in sales
    ]
    return DeliveryListResponse(items=items, total=len(items))


@router.post("/delivery/mark-delivered", response_model=DeliveryListResponse)
def mark_delivered(payload: MarkDeliveredRequest, db: Session = Depends(get_db)):
    sales = db.execute(select(Sale).where(Sale.id.in_(payload.sale_ids))).scalars().all()
    for sale in sales:
        sale.delivery_status = "Delivered"
        sale.delivery_date = date.today()
    db.commit()
    return list_delivery(db=db)


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _sale_read(db, sale)


@router.post("/{sale_id}/send-mail")
def send_sale_mail(sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if not sale.customer or not sale.customer.email:
        raise HTTPException(status_code=400, detail="This customer has no email address on file.")
    if not settings.smtp_host:
        raise HTTPException(
            status_code=400,
            detail="Email sending isn't configured yet. Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM in the backend .env.",
        )

    body = (
        f"Invoice {sale.invoice_no}\n"
        f"Date: {sale.sale_date}\n"
        f"Amount: {sale.amount}\n\n"
        f"Thank you for your business."
    )
    message = MIMEText(body)
    message["Subject"] = f"Invoice {sale.invoice_no}"
    message["From"] = settings.smtp_from or settings.smtp_user
    message["To"] = sale.customer.email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {exc}") from exc

    return {"sent": True, "to": sale.customer.email}


@router.delete("/{sale_id}", status_code=204)
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if db.query(SalesReturn).filter(SalesReturn.sale_id == sale_id).first():
        raise HTTPException(
            status_code=400,
            detail="This sale has a credit note / return against it and cannot be deleted.",
        )
    db.delete(sale)
    db.commit()


@router.put("/{sale_id}", response_model=SaleRead)
def update_sale(sale_id: int, payload: SaleUpdate, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    customer = db.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found")

    _check_stock(db, payload.items, exclude_sale_id=sale_id)
    items, taxable_total, gst_total, grand_total = _build_sale_items(db, payload.items, float(customer.margin))
    final_amount = round(grand_total - payload.discount, 2)

    sale.sale_date = payload.sale_date
    sale.customer_id = payload.customer_id
    sale.selling_price_type = payload.selling_price_type
    sale.route = payload.route
    sale.state_of_supply = payload.state_of_supply
    sale.sales_type = payload.sales_type
    sale.shipping_name = payload.shipping_name
    sale.shipping_address_line1 = payload.shipping_address_line1
    sale.shipping_address_line2 = payload.shipping_address_line2
    sale.shipping_city = payload.shipping_city
    sale.shipping_state = payload.shipping_state
    sale.shipping_pincode = payload.shipping_pincode
    sale.delivery_mode = payload.delivery_mode
    sale.taxable_amount = taxable_total
    sale.gst_amount = gst_total
    sale.discount = payload.discount
    sale.amount = final_amount
    sale.items = items

    db.commit()
    db.refresh(sale)
    return _sale_read(db, sale)
