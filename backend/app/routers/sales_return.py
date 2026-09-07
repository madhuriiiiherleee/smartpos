from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sale, SaleItem, SalesReturn, SalesReturnItem
from app.numbering import reserve_next_number, resolve_financial_year
from app.schemas_sales import (
    ReturnableItem,
    SalesReturnCreate,
    SalesReturnItemRead,
    SalesReturnListItem,
    SalesReturnListResponse,
    SalesReturnRead,
)

router = APIRouter(prefix="/api/sales-returns", tags=["sales-returns"])

SERIES_KEY = "sales_return"
PREFIX = "SR"


def _returned_quantity(db: Session, sale_item_id: int) -> int:
    return db.execute(
        select(func.coalesce(func.sum(SalesReturnItem.quantity), 0)).where(
            SalesReturnItem.sale_item_id == sale_item_id
        )
    ).scalar_one()


@router.get("/returnable-items", response_model=list[ReturnableItem])
def get_returnable_items(sale_id: int, db: Session = Depends(get_db)):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    results = []
    for item in sale.items:
        already_returned = _returned_quantity(db, item.id)
        gst_percent = float(item.gst_percent)
        gross = float(item.price) * (1 - float(item.discount_percent) / 100)
        if item.price_inc_gst:
            unit_taxable = gross / (1 + gst_percent / 100)
        else:
            unit_taxable = gross
        results.append(
            ReturnableItem(
                sale_item_id=item.id,
                product_code=item.product.code if item.product else None,
                product_name=item.product.name if item.product else None,
                sold_quantity=item.quantity,
                already_returned_quantity=already_returned,
                returnable_quantity=item.quantity - already_returned,
                price=float(item.price),
                price_inc_gst=item.price_inc_gst,
                discount_percent=float(item.discount_percent),
                gst_percent=gst_percent,
                unit_taxable=round(unit_taxable, 2),
                unit_gst=round(unit_taxable * gst_percent / 100, 2),
            )
        )
    return results


def _return_item_read(item: SalesReturnItem) -> SalesReturnItemRead:
    data = SalesReturnItemRead.model_validate(item)
    data.product_code = item.sale_item.product.code if item.sale_item and item.sale_item.product else None
    data.product_name = item.sale_item.product.name if item.sale_item and item.sale_item.product else None
    return data


def _return_read(sales_return: SalesReturn) -> SalesReturnRead:
    data = SalesReturnRead.model_validate(sales_return)
    data.invoice_no = sales_return.sale.invoice_no if sales_return.sale else None
    data.customer_name = sales_return.sale.customer.name if sales_return.sale and sales_return.sale.customer else None
    data.items = [_return_item_read(item) for item in sales_return.items]
    return data


@router.get("", response_model=SalesReturnListResponse)
def list_sales_returns(
    date_from: date | None = None,
    date_to: date | None = None,
    customer_id: int | None = None,
    q: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    stmt = select(SalesReturn)
    if date_from:
        stmt = stmt.where(SalesReturn.return_date >= date_from)
    if date_to:
        stmt = stmt.where(SalesReturn.return_date <= date_to)
    if customer_id:
        stmt = stmt.join(Sale, SalesReturn.sale_id == Sale.id).where(Sale.customer_id == customer_id)
    if q:
        stmt = stmt.join(Sale, SalesReturn.sale_id == Sale.id, isouter=True).where(
            (SalesReturn.return_no.ilike(f"%{q}%")) | (Sale.invoice_no.ilike(f"%{q}%"))
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = stmt.order_by(SalesReturn.return_date.desc(), SalesReturn.id.desc()).offset((page - 1) * page_size).limit(
        page_size
    )
    returns = db.execute(stmt).scalars().all()

    items = []
    for r in returns:
        product_names = [
            item.sale_item.product.name
            for item in r.items
            if item.sale_item and item.sale_item.product
        ]
        summary = ", ".join(dict.fromkeys(product_names))
        if len(summary) > 60:
            summary = summary[:57] + "..."
        items.append(
            SalesReturnListItem(
                id=r.id,
                return_no=r.return_no,
                invoice_no=r.sale.invoice_no if r.sale else None,
                customer_name=r.sale.customer.name if r.sale and r.sale.customer else None,
                return_date=r.return_date,
                product_summary=summary or None,
                quantity=sum(item.quantity for item in r.items),
                amount=float(r.amount),
            )
        )
    return SalesReturnListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{return_id}", response_model=SalesReturnRead)
def get_sales_return(return_id: int, db: Session = Depends(get_db)):
    sales_return = db.get(SalesReturn, return_id)
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")
    return _return_read(sales_return)


@router.post("", response_model=SalesReturnRead, status_code=201)
def create_sales_return(payload: SalesReturnCreate, db: Session = Depends(get_db)):
    sale = db.get(Sale, payload.sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    if payload.return_date < sale.sale_date:
        raise HTTPException(status_code=400, detail="Return date cannot be earlier than the original sale date.")

    sale_items_by_id = {item.id: item for item in sale.items}

    # Aggregate quantities per sale line within this request, so a single payload that
    # lists the same sale_item_id twice can't jointly exceed the returnable quantity.
    requested: dict[int, int] = {}
    for line in payload.items:
        if line.sale_item_id not in sale_items_by_id:
            raise HTTPException(status_code=400, detail="That product line does not belong to this sale")
        requested[line.sale_item_id] = requested.get(line.sale_item_id, 0) + line.quantity

    return_items: list[SalesReturnItem] = []
    taxable_total = gst_total = grand_total = 0.0
    for sale_item_id, total_qty in requested.items():
        sale_item = sale_items_by_id[sale_item_id]

        # Lock this sale line for the rest of the transaction so a duplicate/concurrent
        # return request against the same item can't read the same "already returned"
        # total and over-credit stock — it blocks here until this one commits, then
        # re-reads the up-to-date total and is correctly rejected if it would exceed
        # what was sold.
        db.execute(select(SaleItem.id).where(SaleItem.id == sale_item.id).with_for_update())

        already_returned = _returned_quantity(db, sale_item.id)
        returnable = sale_item.quantity - already_returned
        if total_qty > returnable:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return {total_qty} of {sale_item.product.name if sale_item.product else 'item'}"
                f" — only {returnable} left to return",
            )

        # Crediting must mirror how the invoice line was priced: apply the same
        # price_inc_gst / discount treatment the sale used, so a return never
        # over-credits (or under-credits) the customer.
        qty = float(total_qty)
        gross = qty * float(sale_item.price)
        net = gross * (1 - float(sale_item.discount_percent) / 100)
        if sale_item.price_inc_gst:
            unit_taxable = net / (1 + float(sale_item.gst_percent) / 100)
        else:
            unit_taxable = net
        taxable = round(unit_taxable, 2)
        gst = round(taxable * float(sale_item.gst_percent) / 100, 2)
        grand = round(taxable + gst, 2)
        taxable_total += taxable
        gst_total += gst
        grand_total += grand

        return_items.append(
            SalesReturnItem(
                sale_item_id=sale_item.id,
                quantity=total_qty,
                taxable_amount=taxable,
                gst_amount=gst,
                grand_amount=grand,
            )
        )

    financial_year = resolve_financial_year(db, payload.return_date)
    return_no = reserve_next_number(db, financial_year, SERIES_KEY, PREFIX)

    sales_return = SalesReturn(
        return_no=return_no,
        sale_id=sale.id,
        return_date=payload.return_date,
        taxable_amount=round(taxable_total, 2),
        gst_amount=round(gst_total, 2),
        amount=round(grand_total, 2),
        financial_year_id=financial_year.id,
        items=return_items,
    )
    db.add(sales_return)
    db.commit()
    db.refresh(sales_return)
    return _return_read(sales_return)
