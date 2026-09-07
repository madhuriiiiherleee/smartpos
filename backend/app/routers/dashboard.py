import calendar
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Customer,
    CustomerPayment,
    PackingSize,
    Product,
    ProductDetail,
    Purchase,
    PurchaseItem,
    Sale,
    SaleItem,
    SalesOrder,
    SalesReturnItem,
)
from app.numbering import start_year_for
from app.schemas import CustomerBalanceItem, DashboardSummary, LowStockItem, MonthlyReportItem

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    purchase_register = db.scalar(select(func.coalesce(func.sum(Purchase.amount), 0))) or 0
    sales_order_count = db.scalar(select(func.count(SalesOrder.id))) or 0
    sales_count = db.scalar(select(func.count(Sale.id))) or 0
    sales_register = db.scalar(select(func.coalesce(func.sum(Sale.amount), 0))) or 0
    customer_payment = db.scalar(select(func.coalesce(func.sum(CustomerPayment.amount), 0))) or 0

    return DashboardSummary(
        purchase_register=float(purchase_register),
        sales_order_count=int(sales_order_count),
        sales_count=int(sales_count),
        sales_register=float(sales_register),
        customer_payment=float(customer_payment),
    )


@router.get("/purchase-sales-report", response_model=list[MonthlyReportItem])
def get_purchase_sales_report(year: int | None = None, db: Session = Depends(get_db)):
    """Returns the 12 months of the Indian financial year (April - March)
    starting in `year`, defaulting to the FY the current date falls in."""
    fy_start_year = year or start_year_for(date.today())
    fy_months = [(fy_start_year, month) for month in range(4, 13)] + [
        (fy_start_year + 1, month) for month in range(1, 4)
    ]
    fy_start = date(fy_start_year, 4, 1)
    fy_end = date(fy_start_year + 1, 3, 31)

    sales_rows = db.execute(
        select(extract("year", Sale.sale_date), extract("month", Sale.sale_date), func.sum(Sale.amount))
        .where(Sale.sale_date >= fy_start, Sale.sale_date <= fy_end)
        .group_by(extract("year", Sale.sale_date), extract("month", Sale.sale_date))
    ).all()
    purchase_rows = db.execute(
        select(extract("year", Purchase.purchase_date), extract("month", Purchase.purchase_date), func.sum(Purchase.amount))
        .where(Purchase.purchase_date >= fy_start, Purchase.purchase_date <= fy_end)
        .group_by(extract("year", Purchase.purchase_date), extract("month", Purchase.purchase_date))
    ).all()

    sales_by_month = {(int(year_val), int(month_val)): float(total) for year_val, month_val, total in sales_rows}
    purchase_by_month = {(int(year_val), int(month_val)): float(total) for year_val, month_val, total in purchase_rows}

    return [
        MonthlyReportItem(
            month=calendar.month_abbr[month],
            sales=sales_by_month.get((fy_year, month), 0.0),
            purchase=purchase_by_month.get((fy_year, month), 0.0),
        )
        for fy_year, month in fy_months
    ]


@router.get("/customer-balance", response_model=list[CustomerBalanceItem])
def get_customer_balance(db: Session = Depends(get_db)):
    customers = db.execute(select(Customer).order_by(Customer.name)).scalars().all()

    # A customer's outstanding balance is derived live: total sales minus total
    # payments (the stored Customer.balance column is legacy/seeded and never updated,
    # so it's not a reliable source of truth).
    sale_totals = dict(
        db.execute(select(Sale.customer_id, func.sum(Sale.amount)).group_by(Sale.customer_id)).all()
    )
    payment_totals = dict(
        db.execute(select(CustomerPayment.customer_id, func.sum(CustomerPayment.amount)).group_by(CustomerPayment.customer_id)).all()
    )

    return [
        CustomerBalanceItem(
            sl_no=index,
            customer_name=customer.name,
            balance=round(float(sale_totals.get(customer.id, 0.0)) - float(payment_totals.get(customer.id, 0.0)), 2),
        )
        for index, customer in enumerate(customers, start=1)
    ]


@router.get("/low-stock", response_model=list[LowStockItem])
def get_low_stock(db: Session = Depends(get_db)):
    """Top 25 SKUs (product pack sizes) by current available stock, ascending —
    lowest stock first, so the items most in need of reordering surface first.
    Available stock mirrors the sales-entry stock check: purchased - sold(+free) + returned."""
    purchased_sq = (
        select(
            PurchaseItem.product_detail_id.label("product_detail_id"),
            func.sum(PurchaseItem.quantity).label("purchased"),
        )
        .where(PurchaseItem.product_detail_id.isnot(None))
        .group_by(PurchaseItem.product_detail_id)
        .subquery()
    )
    sold_sq = (
        select(
            SaleItem.product_detail_id.label("product_detail_id"),
            func.sum(SaleItem.quantity + SaleItem.free_quantity).label("sold"),
        )
        .where(SaleItem.product_detail_id.isnot(None))
        .group_by(SaleItem.product_detail_id)
        .subquery()
    )
    returned_sq = (
        select(
            SaleItem.product_detail_id.label("product_detail_id"),
            func.sum(SalesReturnItem.quantity).label("returned"),
        )
        .select_from(SalesReturnItem)
        .join(SaleItem, SalesReturnItem.sale_item_id == SaleItem.id)
        .where(SaleItem.product_detail_id.isnot(None))
        .group_by(SaleItem.product_detail_id)
        .subquery()
    )

    available_expr = (
        func.coalesce(purchased_sq.c.purchased, 0)
        - func.coalesce(sold_sq.c.sold, 0)
        + func.coalesce(returned_sq.c.returned, 0)
    ).label("available_quantity")

    stmt = (
        select(
            Product.code.label("product_code"),
            Product.name.label("product_name"),
            ProductDetail.code.label("code"),
            PackingSize.label.label("packing_size"),
            available_expr,
        )
        .select_from(ProductDetail)
        .join(Product, Product.id == ProductDetail.product_id)
        .join(PackingSize, PackingSize.id == ProductDetail.packing_size_id)
        .outerjoin(purchased_sq, purchased_sq.c.product_detail_id == ProductDetail.id)
        .outerjoin(sold_sq, sold_sq.c.product_detail_id == ProductDetail.id)
        .outerjoin(returned_sq, returned_sq.c.product_detail_id == ProductDetail.id)
        .where(Product.active.is_(True))
        .order_by(available_expr)
        .limit(25)
    )
    rows = db.execute(stmt).all()
    return [
        LowStockItem(
            sl_no=index,
            product_code=row.product_code,
            product_name=row.product_name,
            code=row.code,
            packing_size=row.packing_size,
            available_quantity=int(row.available_quantity),
        )
        for index, row in enumerate(rows, start=1)
    ]
