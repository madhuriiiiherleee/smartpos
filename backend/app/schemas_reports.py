from datetime import date

from pydantic import BaseModel


class GstReportRow(BaseModel):
    sl_no: int
    party_name: str | None = None
    gstin: str | None = None
    invoice_no: str | None = None
    invoice_date: date | None = None
    state_of_supply: str | None = None
    state_code: str | None = None
    grand_total: float
    tax_rate: float
    taxable_amount: float
    igst_amount: float
    cgst_amount: float
    sgst_amount: float
    gst_amount: float


class GstReportResponse(BaseModel):
    rows: list[GstReportRow]
    grand_total: float
    taxable_total: float
    igst_total: float
    cgst_total: float
    sgst_total: float
    gst_total: float
