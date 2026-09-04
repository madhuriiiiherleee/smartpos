"""Financial-year-based sequential document numbering, shared by every
module that needs it (Purchase, Sales, Sales Order, Sales Return).

Same concept as the LegalDesk B2B project: a `financial_years` table with
one row marked active at a time, and a per-(series, financial_year) counter
reserved atomically via INSERT ... ON CONFLICT ... DO UPDATE so concurrent
saves can never hand out the same number. Unlike LegalDesk, there is no
admin screen here to manually pick the active year — the active financial
year is instead derived from the document's own date (India FY: April 1 -
March 31), auto-provisioning a new financial_years row the first time a
date in a new year is used. That keeps numbering correct across a
financial-year rollover with zero manual steps.

`DocumentSeriesCounter` lives in the `purchase_series_counters` table (the
name predates Sales/Sales Order/Sales Return reusing it) — the schema
(series_key, financial_year_id, next_number) is generic per-series already,
so every module just picks its own series_key ("purchase", "sales",
"sales_order", "sales_return") rather than each getting a parallel table.
"""

from datetime import date

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models import DocumentSeriesCounter, FinancialYear


def financial_year_label(start_year: int) -> str:
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def start_year_for(on_date: date) -> int:
    return on_date.year if on_date.month >= 4 else on_date.year - 1


def financial_year_bounds(start_year: int) -> tuple[date, date]:
    """India FY: April 1 of start_year through March 31 of start_year + 1."""
    return date(start_year, 4, 1), date(start_year + 1, 3, 31)


def resolve_financial_year(db: Session, on_date: date) -> FinancialYear:
    start_year = start_year_for(on_date)
    fy = db.execute(select(FinancialYear).where(FinancialYear.start_year == start_year)).scalar_one_or_none()
    if fy and fy.is_active:
        return fy

    # Deactivate the currently-active year first, then activate the target —
    # in that order, so the partial unique index on is_active never sees two
    # true rows at once.
    db.execute(update(FinancialYear).where(FinancialYear.is_active == True).values(is_active=False))  # noqa: E712
    db.flush()

    if fy:
        fy.is_active = True
    else:
        fy = FinancialYear(label=financial_year_label(start_year), start_year=start_year, is_active=True)
        db.add(fy)
    db.flush()
    return fy


def reserve_next_number(db: Session, financial_year: FinancialYear, series_key: str, prefix: str) -> str:
    """Atomically claims the next number for (series_key, financial_year)
    and returns the formatted document number, e.g. "PUR/2026-27/0001"."""
    stmt = pg_insert(DocumentSeriesCounter).values(
        series_key=series_key, financial_year_id=financial_year.id, next_number=2
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[DocumentSeriesCounter.series_key, DocumentSeriesCounter.financial_year_id],
        set_={"next_number": DocumentSeriesCounter.next_number + 1, "updated_at": func.now()},
    ).returning(DocumentSeriesCounter.next_number)
    new_next_number = db.execute(stmt).scalar_one()
    issued_number = new_next_number - 1
    return f"{prefix}/{financial_year.label}/{str(issued_number).zfill(4)}"


def peek_next_number(db: Session, series_key: str, prefix: str, on_date: date | None = None) -> tuple[str, str]:
    """Preview only — does not reserve a number. Returns (document_number, financial_year_label)."""
    resolved_date = on_date or date.today()
    start_year = start_year_for(resolved_date)
    label = financial_year_label(start_year)

    fy = db.execute(select(FinancialYear).where(FinancialYear.start_year == start_year)).scalar_one_or_none()
    next_number = 1
    if fy:
        counter = db.execute(
            select(DocumentSeriesCounter).where(
                DocumentSeriesCounter.series_key == series_key,
                DocumentSeriesCounter.financial_year_id == fy.id,
            )
        ).scalar_one_or_none()
        if counter:
            next_number = counter.next_number

    return f"{prefix}/{label}/{str(next_number).zfill(4)}", label
