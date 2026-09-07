import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import PackingSize, Product, ProductDetail, Purchase, PurchaseItem, Sale, SaleItem, SalesReturnItem
from app.numbering import financial_year_bounds
from app.schemas import LowStockItem
from app.schemas_reports import GstReportResponse, GstReportRow

router = APIRouter(prefix="/api/reports", tags=["reports"])

# Standard GST state codes (post state-reorganisation / UT mergers)
STATE_CODES = {
    "Jammu and Kashmir": "01",
    "Himachal Pradesh": "02",
    "Punjab": "03",
    "Chandigarh": "04",
    "Uttarakhand": "05",
    "Haryana": "06",
    "Delhi": "07",
    "Rajasthan": "08",
    "Uttar Pradesh": "09",
    "Bihar": "10",
    "Sikkim": "11",
    "Arunachal Pradesh": "12",
    "Nagaland": "13",
    "Manipur": "14",
    "Mizoram": "15",
    "Tripura": "16",
    "Meghalaya": "17",
    "Assam": "18",
    "West Bengal": "19",
    "Jharkhand": "20",
    "Odisha": "21",
    "Chhattisgarh": "22",
    "Madhya Pradesh": "23",
    "Gujarat": "24",
    "Dadra and Nagar Haveli and Daman and Diu": "26",
    "Maharashtra": "27",
    "Karnataka": "29",
    "Goa": "30",
    "Lakshadweep": "31",
    "Kerala": "32",
    "Tamil Nadu": "33",
    "Puducherry": "34",
    "Andaman and Nicobar Islands": "35",
    "Telangana": "36",
    "Andhra Pradesh": "37",
    "Ladakh": "38",
}


MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _parse_month(month: str) -> int:
    try:
        mon = int(month)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="month must be a number from 1 to 12") from exc
    if mon < 1 or mon > 12:
        raise HTTPException(status_code=400, detail="month must be a number from 1 to 12") from None
    return mon


def _parse_year(year: str) -> int:
    try:
        return int(year)
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="year must be a fiscal year start year, e.g. 2026 for FY 2026-27"
        ) from exc


def _month_date_range(start_year: int, month: int) -> tuple[date, date]:
    """[start, end) date range for `month` (1-12) within the India FY starting `start_year`
    (April 1 of start_year through March 31 of start_year + 1). Months Jan-Mar fall in the
    FY's second calendar year, so e.g. month=1 (January) with start_year=2026 resolves to
    January 2027, not January 2026."""
    fy_start, fy_end = financial_year_bounds(start_year)
    calendar_year = fy_end.year if month <= 3 else fy_start.year
    start = date(calendar_year, month, 1)
    end = date(calendar_year + 1, 1, 1) if month == 12 else date(calendar_year, month + 1, 1)
    return start, end


def _totals(rows: list[GstReportRow]) -> dict:
    return dict(
        grand_total=round(sum(r.grand_total for r in rows), 2),
        taxable_total=round(sum(r.taxable_amount for r in rows), 2),
        igst_total=round(sum(r.igst_amount for r in rows), 2),
        cgst_total=round(sum(r.cgst_amount for r in rows), 2),
        sgst_total=round(sum(r.sgst_amount for r in rows), 2),
        gst_total=round(sum(r.gst_amount for r in rows), 2),
    )


def _build_sales_b2b_rows(db: Session, year: str, month: str) -> list[GstReportRow]:
    start, end = _month_date_range(_parse_year(year), _parse_month(month))
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items), selectinload(Sale.customer))
        .where(Sale.sale_date >= start, Sale.sale_date < end, Sale.customer_id.isnot(None))
        .order_by(Sale.sale_date, Sale.id)
    )
    sales = db.execute(stmt).scalars().all()

    rows: list[GstReportRow] = []
    sl_no = 0
    for sale in sales:
        if not sale.customer or not sale.customer.gst_number:
            continue
        by_rate: dict[float, dict] = {}
        for item in sale.items:
            g = by_rate.setdefault(float(item.gst_percent), dict(taxable=0.0, gst=0.0, cgst=0.0, sgst=0.0, igst=0.0))
            g["taxable"] += float(item.taxable_amount)
            g["gst"] += float(item.gst_amount)
            g["cgst"] += float(item.cgst_amount)
            g["sgst"] += float(item.sgst_amount)
            g["igst"] += float(item.igst_amount)
        for rate, amounts in sorted(by_rate.items()):
            sl_no += 1
            rows.append(
                GstReportRow(
                    sl_no=sl_no,
                    party_name=sale.customer.name,
                    gstin=sale.customer.gst_number,
                    invoice_no=sale.invoice_no,
                    invoice_date=sale.sale_date,
                    grand_total=round(amounts["taxable"] + amounts["gst"], 2),
                    tax_rate=rate,
                    taxable_amount=round(amounts["taxable"], 2),
                    igst_amount=round(amounts["igst"], 2),
                    cgst_amount=round(amounts["cgst"], 2),
                    sgst_amount=round(amounts["sgst"], 2),
                    gst_amount=round(amounts["gst"], 2),
                )
            )
    return rows


def _build_sales_b2c_rows(db: Session, year: str, month: str) -> list[GstReportRow]:
    start, end = _month_date_range(_parse_year(year), _parse_month(month))
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items), selectinload(Sale.customer))
        .where(Sale.sale_date >= start, Sale.sale_date < end, Sale.customer_id.isnot(None))
    )
    sales = db.execute(stmt).scalars().all()

    groups: dict[tuple[str, float], dict] = {}
    for sale in sales:
        if sale.customer and sale.customer.gst_number:
            continue
        state = sale.state_of_supply or "Unknown"
        for item in sale.items:
            key = (state, float(item.gst_percent))
            g = groups.setdefault(key, dict(taxable=0.0, gst=0.0, cgst=0.0, sgst=0.0, igst=0.0))
            g["taxable"] += float(item.taxable_amount)
            g["gst"] += float(item.gst_amount)
            g["cgst"] += float(item.cgst_amount)
            g["sgst"] += float(item.sgst_amount)
            g["igst"] += float(item.igst_amount)

    rows: list[GstReportRow] = []
    for sl_no, ((state, rate), amounts) in enumerate(sorted(groups.items()), start=1):
        rows.append(
            GstReportRow(
                sl_no=sl_no,
                state_of_supply=state,
                state_code=STATE_CODES.get(state),
                grand_total=round(amounts["taxable"] + amounts["gst"], 2),
                tax_rate=rate,
                taxable_amount=round(amounts["taxable"], 2),
                igst_amount=round(amounts["igst"], 2),
                cgst_amount=round(amounts["cgst"], 2),
                sgst_amount=round(amounts["sgst"], 2),
                gst_amount=round(amounts["gst"], 2),
            )
        )
    return rows


def _build_purchase_gst_rows(db: Session, year: str, month: str) -> list[GstReportRow]:
    start, end = _month_date_range(_parse_year(year), _parse_month(month))
    stmt = (
        select(Purchase)
        .options(selectinload(Purchase.items), selectinload(Purchase.supplier))
        .where(Purchase.purchase_date >= start, Purchase.purchase_date < end, Purchase.supplier_id.isnot(None))
        .order_by(Purchase.purchase_date, Purchase.id)
    )
    purchases = db.execute(stmt).scalars().all()

    rows: list[GstReportRow] = []
    sl_no = 0
    for purchase in purchases:
        by_rate: dict[float, dict] = {}
        for item in purchase.items:
            g = by_rate.setdefault(float(item.gst_percent), dict(taxable=0.0, gst=0.0, cgst=0.0, sgst=0.0, igst=0.0))
            g["taxable"] += float(item.taxable_amount)
            g["gst"] += float(item.gst_amount)
            g["cgst"] += float(item.cgst_amount)
            g["sgst"] += float(item.sgst_amount)
            g["igst"] += float(item.igst_amount)
        for rate, amounts in sorted(by_rate.items()):
            sl_no += 1
            rows.append(
                GstReportRow(
                    sl_no=sl_no,
                    party_name=purchase.supplier.name if purchase.supplier else None,
                    gstin=purchase.supplier.gst_number if purchase.supplier else None,
                    invoice_no=purchase.invoice_no,
                    invoice_date=purchase.purchase_date,
                    grand_total=round(amounts["taxable"] + amounts["gst"], 2),
                    tax_rate=rate,
                    taxable_amount=round(amounts["taxable"], 2),
                    igst_amount=round(amounts["igst"], 2),
                    cgst_amount=round(amounts["cgst"], 2),
                    sgst_amount=round(amounts["sgst"], 2),
                    gst_amount=round(amounts["gst"], 2),
                )
            )
    return rows


REPORT_BUILDERS = {
    "sales-b2b": (_build_sales_b2b_rows, "Sales B2B", ["party_name", "gstin", "invoice_no", "invoice_date"]),
    "sales-b2c": (_build_sales_b2c_rows, "Sales B2C", ["state_of_supply", "state_code"]),
    "purchase-gst": (_build_purchase_gst_rows, "Purchase GST", ["party_name", "gstin", "invoice_no", "invoice_date"]),
}

COLUMN_LABELS = {
    "party_name": "Name",
    "gstin": "GSTIN",
    "invoice_no": "Invoice #",
    "invoice_date": "Invoice Date",
    "state_of_supply": "State of Supply",
    "state_code": "State Code",
}

AMOUNT_COLUMNS = [
    ("grand_total", "Grand Total"),
    ("tax_rate", "Tax Rate"),
    ("taxable_amount", "Taxable Amount"),
    ("cgst_amount", "CGST Amount"),
    ("sgst_amount", "SGST Amount"),
]


@router.get("/sales-b2b", response_model=GstReportResponse)
def sales_b2b_report(year: str, month: str, db: Session = Depends(get_db)):
    rows = _build_sales_b2b_rows(db, year, month)
    return GstReportResponse(rows=rows, **_totals(rows))


@router.get("/sales-b2c", response_model=GstReportResponse)
def sales_b2c_report(year: str, month: str, db: Session = Depends(get_db)):
    rows = _build_sales_b2c_rows(db, year, month)
    return GstReportResponse(rows=rows, **_totals(rows))


@router.get("/purchase-gst", response_model=GstReportResponse)
def purchase_gst_report(year: str, month: str, db: Session = Depends(get_db)):
    rows = _build_purchase_gst_rows(db, year, month)
    return GstReportResponse(rows=rows, **_totals(rows))


def _build_stock_rows(db: Session, category_id: int | None, product_id: int | None) -> list[LowStockItem]:
    """Current available stock per product pack size — same purchased -
    sold(+free) + returned calculation as the Dashboard's low-stock widget,
    but unfiltered by rank/limit and open to Category/Product filters."""
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
    )
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if product_id is not None:
        stmt = stmt.where(Product.id == product_id)
    stmt = stmt.order_by(Product.name, PackingSize.label)

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


@router.get("/stock", response_model=list[LowStockItem])
def stock_report(category_id: int | None = None, product_id: int | None = None, db: Session = Depends(get_db)):
    return _build_stock_rows(db, category_id, product_id)


@router.get("/stock/export")
def export_stock_report(category_id: int | None = None, product_id: int | None = None, db: Session = Depends(get_db)):
    rows = _build_stock_rows(db, category_id, product_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "Stock Report"
    ws.append(["SL #", "Product Code", "Product Name", "Pack Code", "Packing Size", "Available Stock"])
    for row in rows:
        ws.append([row.sl_no, row.product_code, row.product_name, row.code, row.packing_size, row.available_quantity])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="stock-report.xlsx"'},
    )


@router.get("/{report_key}/export")
def export_report(report_key: str, year: str, month: str, db: Session = Depends(get_db)):
    if report_key not in REPORT_BUILDERS:
        raise HTTPException(status_code=404, detail="Unknown report")
    builder, title, extra_columns = REPORT_BUILDERS[report_key]
    rows = builder(db, year, month)

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]

    headers = ["SL #"] + [COLUMN_LABELS[c] for c in extra_columns] + [label for _, label in AMOUNT_COLUMNS]
    ws.append(headers)

    for row in rows:
        data = [row.sl_no]
        for col in extra_columns:
            value = getattr(row, col)
            data.append(value.strftime("%d-%m-%Y") if isinstance(value, date) else value)
        for col, _ in AMOUNT_COLUMNS:
            data.append(getattr(row, col))
        ws.append(data)

    totals = _totals(rows)
    total_row = [""] * (1 + len(extra_columns))
    total_row[0] = "Grand Total"
    total_row += [
        totals["grand_total"],
        "",
        totals["taxable_total"],
        totals["cgst_total"],
        totals["sgst_total"],
    ]
    ws.append(total_row)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    filename = f"{report_key}-{MONTH_NAMES[_parse_month(month) - 1]}-{_parse_year(year)}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
