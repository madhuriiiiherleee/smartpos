from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Purchase, PurchaseItem
from app.numbering import resolve_financial_year
from app.schemas_purchase import (
    PurchaseCreate,
    PurchaseItemRead,
    PurchaseListItem,
    PurchaseListResponse,
    PurchaseRead,
    PurchaseUpdate,
)

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


# ---------------- Purchase CRUD ----------------


def _build_items(payload_items) -> tuple[list[PurchaseItem], float, float, float]:
    rows: list[PurchaseItem] = []
    taxable_total = gst_total = grand_total = 0.0
    for item in payload_items:
        gross = item.quantity * item.purchase_price
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
            PurchaseItem(
                product_id=item.product_id,
                product_detail_id=item.product_detail_id,
                quantity=item.quantity,
                purchase_price=item.purchase_price,
                price_inc_gst=item.price_inc_gst,
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


def _purchase_item_read(item: PurchaseItem) -> PurchaseItemRead:
    data = PurchaseItemRead.model_validate(item)
    data.product_code = item.product.code if item.product else None
    data.product_name = item.product.name if item.product else None
    data.hsn_code = item.product.hsn_code if item.product else None
    data.code = item.product_detail.code if item.product_detail else None
    data.packing_size = item.product_detail.packing_size_ref.label if item.product_detail else None
    data.qty_per_box = item.product_detail.qty_per_box if item.product_detail else None
    return data


def _purchase_read(purchase: Purchase) -> PurchaseRead:
    data = PurchaseRead.model_validate(purchase)
    data.supplier_name = purchase.supplier.name if purchase.supplier else None
    data.items = [_purchase_item_read(item) for item in purchase.items]
    return data


@router.post("", response_model=PurchaseRead, status_code=201)
def create_purchase(payload: PurchaseCreate, db: Session = Depends(get_db)):
    financial_year = resolve_financial_year(db, payload.invoice_date)
    items, taxable_total, gst_total, grand_total = _build_items(payload.items)
    final_amount = round(grand_total - payload.discount + payload.tcs + payload.round_off, 2)

    purchase = Purchase(
        invoice_no=payload.invoice_no.strip(),
        purchase_date=payload.invoice_date,
        amount=final_amount,
        supplier_id=payload.supplier_id,
        invoice_type=payload.invoice_type,
        taxable_amount=taxable_total,
        gst_amount=gst_total,
        discount=payload.discount,
        tcs=payload.tcs,
        round_off=payload.round_off,
        financial_year_id=financial_year.id,
        items=items,
    )
    db.add(purchase)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="This invoice number already exists for this supplier — please check and enter a different number.",
        ) from exc
    db.refresh(purchase)
    return _purchase_read(purchase)


@router.get("", response_model=PurchaseListResponse)
def list_purchases(
    date_from: date | None = None,
    date_to: date | None = None,
    supplier_id: int | None = None,
    invoice_no: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    # Excludes legacy dashboard-demo rows (seeded before this module existed,
    # with no supplier/line items) — the Dashboard's own aggregate total is a
    # separate query and is intentionally unaffected by this filter.
    stmt = select(Purchase).where(Purchase.supplier_id.isnot(None))
    if date_from:
        stmt = stmt.where(Purchase.purchase_date >= date_from)
    if date_to:
        stmt = stmt.where(Purchase.purchase_date <= date_to)
    if supplier_id:
        stmt = stmt.where(Purchase.supplier_id == supplier_id)
    if invoice_no:
        # Exact, case-insensitive match — used to warn about a duplicate
        # vendor invoice number before the unique-constraint save fails.
        stmt = stmt.where(func.lower(Purchase.invoice_no) == invoice_no.strip().lower())

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = (
        stmt.order_by(Purchase.purchase_date.desc(), Purchase.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    purchases = db.execute(stmt).scalars().all()

    items = [
        PurchaseListItem(
            id=p.id,
            invoice_no=p.invoice_no,
            purchase_date=p.purchase_date,
            supplier_name=p.supplier.name if p.supplier else None,
            amount=float(p.amount),
        )
        for p in purchases
    ]
    return PurchaseListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{purchase_id}", response_model=PurchaseRead)
def get_purchase(purchase_id: int, db: Session = Depends(get_db)):
    purchase = db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return _purchase_read(purchase)


@router.put("/{purchase_id}", response_model=PurchaseRead)
def update_purchase(purchase_id: int, payload: PurchaseUpdate, db: Session = Depends(get_db)):
    purchase = db.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    # invoice_type/discount/tcs are no longer collected by the Purchase Entry UI. When the
    # request omits them, keep the purchase's existing values instead of overwriting with
    # the schema defaults (Cash/0/0).
    provided = payload.model_fields_set
    invoice_type = payload.invoice_type if "invoice_type" in provided else purchase.invoice_type
    discount = payload.discount if "discount" in provided else float(purchase.discount)
    tcs = payload.tcs if "tcs" in provided else float(purchase.tcs)

    items, taxable_total, gst_total, grand_total = _build_items(payload.items)
    final_amount = round(grand_total - discount + tcs + payload.round_off, 2)
    financial_year = resolve_financial_year(db, payload.invoice_date)

    purchase.invoice_no = payload.invoice_no.strip()
    purchase.purchase_date = payload.invoice_date
    purchase.financial_year_id = financial_year.id
    purchase.supplier_id = payload.supplier_id
    purchase.invoice_type = invoice_type
    purchase.taxable_amount = taxable_total
    purchase.gst_amount = gst_total
    purchase.discount = discount
    purchase.tcs = tcs
    purchase.round_off = payload.round_off
    purchase.amount = final_amount
    purchase.items = items

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="This invoice number already exists for this supplier — please check and enter a different number.",
        ) from exc
    db.refresh(purchase)
    return _purchase_read(purchase)
