from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

SALES_TYPES = ("Cash", "Credit")
DELIVERY_MODES = ("Delivery", "Pickup", "Courier")
DELIVERY_STATUSES = ("Pending", "Delivered")

INDIAN_STATES = (
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
    "Lakshadweep", "Puducherry",
)


# ---------------- Sale (Sales Entry) ----------------


class SaleItemCreate(BaseModel):
    product_id: int
    product_detail_id: int | None = None
    quantity: int = Field(gt=0)
    free_quantity: int = Field(default=0, ge=0)
    uom: str = "UNIT"
    price: float = Field(ge=0)
    price_inc_gst: bool = False
    discount_percent: float = Field(default=0, ge=0, le=100)
    gst_percent: float = Field(ge=0)
    is_igst: bool = False


class SaleItemRead(BaseModel):
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
    free_quantity: int
    uom: str
    price: float
    price_inc_gst: bool = False
    retail_price: float | None = None
    discount_percent: float
    gst_percent: float
    is_igst: bool
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    taxable_amount: float
    gst_amount: float
    grand_amount: float
    returned_quantity: int = 0


class SaleCreate(BaseModel):
    sale_date: date
    customer_id: int
    selling_price_type: str = "Retail"
    route: str | None = None
    state_of_supply: str | None = None
    sales_type: str = "Cash"
    shipping_name: str | None = None
    shipping_address_line1: str | None = None
    shipping_address_line2: str | None = None
    shipping_city: str | None = None
    shipping_state: str | None = None
    shipping_pincode: str | None = None
    delivery_mode: str = "Delivery"
    discount: float = Field(default=0, ge=0)
    items: list[SaleItemCreate] = Field(min_length=1)


class SaleUpdate(SaleCreate):
    pass


class SaleListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    sale_date: date
    customer_name: str | None = None
    sales_type: str | None
    amount: float


class SaleListResponse(BaseModel):
    items: list[SaleListItem]
    total: int
    page: int
    page_size: int


class SaleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    sale_date: date
    customer_id: int | None
    customer_name: str | None = None
    selling_price_type: str | None
    route: str | None
    state_of_supply: str | None
    sales_type: str | None
    shipping_name: str | None
    shipping_address_line1: str | None
    shipping_address_line2: str | None
    shipping_city: str | None
    shipping_state: str | None
    shipping_pincode: str | None
    delivery_mode: str | None
    delivery_status: str
    delivery_date: date | None
    taxable_amount: float | None
    gst_amount: float | None
    discount: float
    amount: float
    created_at: datetime
    items: list[SaleItemRead] = []


# ---------------- Sales Order ----------------


class SalesOrderItemCreate(BaseModel):
    product_id: int
    product_detail_id: int | None = None
    quantity: int = Field(gt=0)
    free_quantity: int = 0
    uom: str = "UNIT"
    price: float
    price_inc_gst: bool = False
    discount_percent: float = Field(default=0, ge=0)
    gst_percent: float = Field(default=0, ge=0)
    is_igst: bool = False
    cgst_amount: float = 0
    sgst_amount: float = 0
    igst_amount: float = 0
    taxable_amount: float
    gst_amount: float
    grand_amount: float


class SalesOrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product_code: str | None = None
    product_name: str | None = None
    quantity: int


class SalesOrderCreate(BaseModel):
    order_date: date
    customer_id: int
    sales_type: str = "Cash"
    discount: float = Field(default=0, ge=0)
    items: list[SalesOrderItemCreate] = Field(min_length=1)


class SalesOrderUpdate(SalesOrderCreate):
    pass


class SalesOrderListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_no: str
    order_date: date
    customer_name: str | None = None
    sales_type: str | None = None


class SalesOrderListResponse(BaseModel):
    items: list[SalesOrderListItem]
    total: int
    page: int
    page_size: int


class SalesOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_no: str
    order_date: date
    customer_id: int | None
    customer_name: str | None = None
    sales_type: str | None = None
    created_at: datetime
    items: list[SalesOrderItemRead] = []


# ---------------- Delivery List ----------------


class DeliveryListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    invoice_no: str
    customer_name: str | None = None
    delivery_status: str
    delivery_date: date | None
    payment_type: str | None = None
    route: str | None = None


class DeliveryListResponse(BaseModel):
    items: list[DeliveryListItem]
    total: int


class MarkDeliveredRequest(BaseModel):
    sale_ids: list[int] = Field(min_length=1)


# ---------------- Sales Return ----------------


class ReturnableItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sale_item_id: int
    product_code: str | None = None
    product_name: str | None = None
    sold_quantity: int
    already_returned_quantity: int
    returnable_quantity: int
    price: float
    price_inc_gst: bool = False
    discount_percent: float = 0
    gst_percent: float
    unit_taxable: float = 0
    unit_gst: float = 0


class SalesReturnItemCreate(BaseModel):
    sale_item_id: int
    quantity: int = Field(gt=0)


class SalesReturnCreate(BaseModel):
    sale_id: int
    return_date: date
    items: list[SalesReturnItemCreate] = Field(min_length=1)


class SalesReturnItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sale_item_id: int
    product_code: str | None = None
    product_name: str | None = None
    quantity: int
    taxable_amount: float
    gst_amount: float
    grand_amount: float


class SalesReturnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    return_no: str
    sale_id: int
    invoice_no: str | None = None
    customer_name: str | None = None
    return_date: date
    taxable_amount: float
    gst_amount: float
    amount: float
    items: list[SalesReturnItemRead] = []


class SalesReturnListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    return_no: str
    invoice_no: str | None = None
    customer_name: str | None = None
    return_date: date
    product_summary: str | None = None
    quantity: int
    amount: float


class SalesReturnListResponse(BaseModel):
    items: list[SalesReturnListItem]
    total: int
    page: int
    page_size: int


class NextNumberResponse(BaseModel):
    number: str
    financial_year: str


class AvailableQuantityResponse(BaseModel):
    product_detail_id: int
    available_quantity: int
