from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

INVOICE_TYPES = ("Cash", "Credit")


class PurchaseItemCreate(BaseModel):
    product_id: int
    product_detail_id: int | None = None
    quantity: int = Field(gt=0)
    purchase_price: float = Field(ge=0)
    price_inc_gst: bool = False
    discount_percent: float = Field(default=0, ge=0, le=100)
    gst_percent: float = Field(ge=0)
    is_igst: bool = False


class PurchaseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_detail_id: int | None
    product_code: str | None = None
    product_name: str | None = None
    hsn_code: str | None = None
    code: str | None = None
    packing_size: str | None = None
    qty_per_box: int | None = None
    quantity: int
    purchase_price: float
    price_inc_gst: bool = False
    discount_percent: float
    gst_percent: float
    is_igst: bool
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    taxable_amount: float
    gst_amount: float
    grand_amount: float


class PurchaseCreate(BaseModel):
    invoice_no: str = Field(min_length=1, max_length=50)
    invoice_date: date
    supplier_id: int
    invoice_type: str = "Cash"
    discount: float = Field(default=0, ge=0)
    tcs: float = Field(default=0, ge=0)
    round_off: float = 0
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseUpdate(BaseModel):
    invoice_no: str = Field(min_length=1, max_length=50)
    invoice_date: date
    supplier_id: int
    invoice_type: str = "Cash"
    discount: float = Field(default=0, ge=0)
    tcs: float = Field(default=0, ge=0)
    round_off: float = 0
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    purchase_date: date
    supplier_name: str | None = None
    amount: float


class PurchaseListResponse(BaseModel):
    items: list[PurchaseListItem]
    total: int
    page: int
    page_size: int


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    purchase_date: date
    supplier_id: int | None
    supplier_name: str | None = None
    invoice_type: str | None
    taxable_amount: float | None
    gst_amount: float | None
    discount: float
    tcs: float
    round_off: float
    amount: float
    created_at: datetime
    items: list[PurchaseItemRead] = []

