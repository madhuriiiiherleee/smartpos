from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SalesOrder, SalesOrderItem
from app.numbering import peek_next_number, reserve_next_number, resolve_financial_year
from app.schemas_sales import (
    NextNumberResponse,
    SalesOrderCreate,
    SalesOrderItemRead,
    SalesOrderListItem,
    SalesOrderListResponse,
    SalesOrderRead,
    SalesOrderUpdate,
)

router = APIRouter(prefix="/api/sales-orders", tags=["sales-orders"])

SERIES_KEY = "sales_order"
PREFIX = "SO"


@router.get("/next-order-number", response_model=NextNumberResponse)
def peek_next_order_number(order_date: date | None = None, db: Session = Depends(get_db)):
    number, label = peek_next_number(db, SERIES_KEY, PREFIX, order_date)
    return NextNumberResponse(number=number, financial_year=label)


def _build_order_items(payload_items) -> list[SalesOrderItem]:
    return [SalesOrderItem(product_id=i.product_id, quantity=i.quantity) for i in payload_items]


def _order_item_read(item: SalesOrderItem) -> SalesOrderItemRead:
    data = SalesOrderItemRead.model_validate(item)
    data.product_code = item.product.code if item.product else None
    data.product_name = item.product.name if item.product else None
    return data


def _order_read(order: SalesOrder) -> SalesOrderRead:
    data = SalesOrderRead.model_validate(order)
    data.customer_name = order.customer.name if order.customer else None
    data.items = [_order_item_read(item) for item in order.items]
    return data


@router.post("", response_model=SalesOrderRead, status_code=201)
def create_sales_order(payload: SalesOrderCreate, db: Session = Depends(get_db)):
    financial_year = resolve_financial_year(db, payload.order_date)
    order_no = reserve_next_number(db, financial_year, SERIES_KEY, PREFIX)

    order = SalesOrder(
        order_no=order_no,
        order_date=payload.order_date,
        customer_id=payload.customer_id,
        sales_type=payload.sales_type,
        financial_year_id=financial_year.id,
        items=_build_order_items(payload.items),
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return _order_read(order)


@router.get("", response_model=SalesOrderListResponse)
def list_sales_orders(
    date_from: date | None = None,
    date_to: date | None = None,
    customer_id: int | None = None,
    sales_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    # Excludes legacy dashboard-demo rows (seeded before this module existed).
    stmt = select(SalesOrder).where(SalesOrder.customer_id.isnot(None))
    if date_from:
        stmt = stmt.where(SalesOrder.order_date >= date_from)
    if date_to:
        stmt = stmt.where(SalesOrder.order_date <= date_to)
    if customer_id:
        stmt = stmt.where(SalesOrder.customer_id == customer_id)
    if sales_type:
        stmt = stmt.where(SalesOrder.sales_type == sales_type)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = (
        stmt.order_by(SalesOrder.order_date.desc(), SalesOrder.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = db.execute(stmt).scalars().all()

    items = [
        SalesOrderListItem(
            id=o.id,
            order_no=o.order_no,
            order_date=o.order_date,
            customer_name=o.customer.name if o.customer else None,
            sales_type=o.sales_type,
        )
        for o in orders
    ]
    return SalesOrderListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{order_id}", response_model=SalesOrderRead)
def get_sales_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return _order_read(order)


@router.put("/{order_id}", response_model=SalesOrderRead)
def update_sales_order(order_id: int, payload: SalesOrderUpdate, db: Session = Depends(get_db)):
    order = db.get(SalesOrder, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")

    order.order_date = payload.order_date
    order.customer_id = payload.customer_id
    order.sales_type = payload.sales_type
    order.items = _build_order_items(payload.items)

    db.commit()
    db.refresh(order)
    return _order_read(order)
