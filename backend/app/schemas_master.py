from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ActiveToggle(BaseModel):
    active: bool


# ---------- Category ----------


class CategoryBase(BaseModel):
    code: str
    name: str
    active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Packing Size ----------


class PackingSizeBase(BaseModel):
    value: float | None = None
    unit: str
    active: bool = True


class PackingSizeCreate(PackingSizeBase):
    pass


class PackingSizeUpdate(PackingSizeBase):
    pass


class PackingSizeRead(PackingSizeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    label: str


# ---------- Product ----------


class ProductBase(BaseModel):
    category_id: int
    code: str
    name: str
    description: str | None = None
    hsn_code: str | None = None
    cgst_percent: float | None = None
    sgst_percent: float | None = None
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_name: str | None = None
    wholesale_price: float | None = None
    retail_price_amount: float | None = None
    mrp_amount: float | None = None
    pack_size_count: int = 0


class ProductWithDetailCreate(BaseModel):
    category_id: int
    code: str
    name: str
    description: str | None = None
    hsn_code: str | None = None
    cgst_percent: float | None = None
    sgst_percent: float | None = None
    active: bool = True
    packing_size_id: int
    qty_per_box: int
    rate_per_unit: float
    retail_price: float
    mrp: float


# ---------- Product Detail ----------


class ProductDetailBase(BaseModel):
    product_id: int
    code: str
    packing_size_id: int
    qty_per_box: int
    rate_per_unit: float
    retail_price: float
    mrp: float


class ProductDetailCreate(ProductDetailBase):
    pass


class ProductDetailUpdate(ProductDetailBase):
    pass


class ProductDetailRead(ProductDetailBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_name: str | None = None
    packing_size: str | None = None


# ---------- Vendor ----------


class VendorBase(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    active: bool = True


class VendorCreate(VendorBase):
    pass


class VendorUpdate(VendorBase):
    pass


class VendorRead(VendorBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ---------- Customer (master) ----------


class CustomerRouteInput(BaseModel):
    route_name: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    is_default: bool = False


class CustomerRouteRead(CustomerRouteInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class CustomerMasterBase(BaseModel):
    name: str
    business_name: str
    margin: float = Field(default=0, ge=0, le=100)
    contact_person: str | None = None
    phone: str | None = None
    mobile_number_2: str | None = None
    email: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    selling_price_type: str = "Retail"
    active: bool = True


class CustomerMasterCreate(CustomerMasterBase):
    routes: list[CustomerRouteInput] = []


class CustomerMasterUpdate(CustomerMasterBase):
    routes: list[CustomerRouteInput] = []


class CustomerMasterRead(CustomerMasterBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    balance: float
    routes: list[CustomerRouteRead] = []


# ---------- Financial Year ----------


class FinancialYearCreate(BaseModel):
    start_year: int
    make_active: bool = False


class FinancialYearRead(BaseModel):
    id: int
    label: str
    start_year: int
    is_active: bool
    start_date: date
    end_date: date
