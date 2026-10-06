from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sale, SaleItem, SalesReturn, SalesReturnItem
from app.numbering import active_financial_year_id, reserve_next_number, resolve_financial_year
from app.schemas_sales import (
    ReturnableItem,
    SalesReturnCreate,
    SalesReturnItemCreate,
    SalesReturnItemRead,
    SalesReturnListItem,
    SalesReturnListResponse,
    SalesReturnRead,
    SalesReturnUpdate,
)

router = APIRouter(prefix="/api/sales-returns", tags=["sales-returns"])

SERIES_KEY = "sales_return"
PREFIX = "SR"


def _returned_quantity(db: Session, sale_item_id: int, exclude_return_id: int | None = None) -> int:
    stmt = select(func.coalesce(func.sum(SalesReturnItem.quantity), 0)).where(
        SalesReturnItem.sale_item_id == sale_item_id
    )
    if exclude_return_id is not None:
        # When editing a credit note, its own rows must not count towards the
        # cap — otherwise every line would read as "already fully returned" and
        # the operator could never change a quantity.
        stmt = stmt.where(SalesReturnItem.sales_return_id != exclude_return_id)
    return db.execute(stmt).scalar_one()


def _qty_per_box(item: SaleItem) -> int:
    detail = item.product_detail
    return detail.qty_per_box if detail and detail.qty_per_box else 1


def _build_return_items(
    db: Session,
    sale: Sale,
    lines: list[SalesReturnItemCreate],
    exclude_return_id: int | None = None,
) -> tuple[list[SalesReturnItem], float, float, float]:
    """Validate the requested return lines and turn them into priced credit-note rows.

    Returns (items, taxable_total, gst_total, grand_total). Shared by create and
    update so the two can never disagree on what a valid return is — an edited
    credit note is re-validated through exactly the same rules as a new one.

    exclude_return_id is set when updating: the credit note being edited must not
    count against its own returnable cap.
    """
    sale_items_by_id = {item.id: item for item in sale.items}

    # Resolve each line to a piece count and aggregate per sale line, so a single
    # payload that lists the same sale_item_id twice can't jointly exceed the
    # returnable quantity. The client may send boxes + loose_units instead of a
    # raw piece count; the box size comes from the sold pack, never the client.
    requested: dict[int, int] = {}
    for line in lines:
        if line.sale_item_id not in sale_items_by_id:
            raise HTTPException(status_code=400, detail="That product line does not belong to this sale")
        qpb = _qty_per_box(sale_items_by_id[line.sale_item_id])
        if line.boxes or line.loose_units:
            # Deliberately no loose-vs-box-size check. A customer can hand back
            # more loose pieces than one full box holds (e.g. 18 loose from a
            # 12-piece carton), and the operator cannot know that, so the split
            # is accepted as given and only the piece total is checked.
            qty = line.boxes * qpb + line.loose_units
        else:
            qty = line.quantity or 0
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Enter a return quantity greater than 0")
        requested[line.sale_item_id] = requested.get(line.sale_item_id, 0) + qty

    return_items: list[SalesReturnItem] = []
    taxable_total = gst_total = grand_total = 0.0
    for sale_item_id, total_qty in requested.items():
        sale_item = sale_items_by_id[sale_item_id]
        qpb = _qty_per_box(sale_item)

        # Lock this sale line for the rest of the transaction so a duplicate/concurrent
        # return request against the same item can't read the same "already returned"
        # total and over-credit stock — it blocks here until this one commits, then
        # re-reads the up-to-date total and is correctly rejected if it would exceed
        # what was sold.
        db.execute(select(SaleItem.id).where(SaleItem.id == sale_item.id).with_for_update())

        already_returned = _returned_quantity(db, sale_item.id, exclude_return_id)
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
                # Freeze the split onto the credit note: re-derived from the sold
                # pack's size so the stored boxes + loose always equal quantity,
                # and stay correct even if the product's pack size changes later.
                boxes=total_qty // qpb if qpb > 1 else 0,
                loose_units=total_qty % qpb if qpb > 1 else total_qty,
                qty_per_box=qpb,
                taxable_amount=taxable,
                gst_amount=gst,
                grand_amount=grand,
            )
        )

    return return_items, round(taxable_total, 2), round(gst_total, 2), round(grand_total, 2)


@router.get("/returnable-items", response_model=list[ReturnableItem])
def get_returnable_items(
    sale_id: int,
    exclude_return_id: int | None = None,
    db: Session = Depends(get_db),
):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    results = []
    for item in sale.items:
        already_returned = _returned_quantity(db, item.id, exclude_return_id)
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
                qty_per_box=_qty_per_box(item),
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
    if not date_from and not date_to:
        fy_id = active_financial_year_id(db)
        if fy_id is not None:
            stmt = stmt.where(SalesReturn.financial_year_id == fy_id)
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

    return_items, taxable_total, gst_total, grand_total = _build_return_items(db, sale, payload.items)

    financial_year = resolve_financial_year(db, payload.return_date)
    return_no = reserve_next_number(db, financial_year, SERIES_KEY, PREFIX)

    sales_return = SalesReturn(
        return_no=return_no,
        sale_id=sale.id,
        return_date=payload.return_date,
        taxable_amount=taxable_total,
        gst_amount=gst_total,
        amount=grand_total,
        financial_year_id=financial_year.id,
        items=return_items,
    )
    db.add(sales_return)
    db.commit()
    db.refresh(sales_return)
    return _return_read(sales_return)


@router.put("/{return_id}", response_model=SalesReturnRead)
def update_sales_return(return_id: int, payload: SalesReturnUpdate, db: Session = Depends(get_db)):
    sales_return = db.get(SalesReturn, return_id)
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")

    sale = sales_return.sale
    if not sale:
        raise HTTPException(status_code=404, detail="Sales return not found")

    if payload.return_date < sale.sale_date:
        raise HTTPException(status_code=400, detail="Return date cannot be earlier than the original sale date.")

    # The line set may change entirely, so validate against the cap as if this
    # credit note did not exist yet — its own quantities are excluded.
    return_items, taxable_total, gst_total, grand_total = _build_return_items(
        db, sale, payload.items, exclude_return_id=sales_return.id
    )

    financial_year = resolve_financial_year(db, payload.return_date)

    # return_no is deliberately left alone. A credit note number is immutable —
    # it may already have been issued to a customer or filed in GST returns, so
    # editing the goods on it must not hand the same number different contents.
    sales_return.return_date = payload.return_date
    sales_return.financial_year_id = financial_year.id
    sales_return.taxable_amount = taxable_total
    sales_return.gst_amount = gst_total
    sales_return.amount = grand_total
    # The relationship is cascade="all, delete-orphan", so replacing the
    # collection drops the previous credit-note lines in the same transaction.
    sales_return.items = return_items

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not save sales return — please retry") from exc
    db.refresh(sales_return)
    return _return_read(sales_return)


@router.delete("/{return_id}", status_code=204)
def delete_sales_return(return_id: int, db: Session = Depends(get_db)):
    sales_return = db.get(SalesReturn, return_id)
    if not sales_return:
        raise HTTPException(status_code=404, detail="Sales return not found")

    # Child lines go with it via the cascade, and because "already returned" is
    # a live SUM over sales_return_items, the sale's returnable quantities
    # immediately open back up — including unblocking that sale for edit/delete
    # in sales.py, which refuses to touch a sale that still has a return.
    db.delete(sales_return)
    db.commit()
