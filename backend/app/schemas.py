from pydantic import BaseModel


class DashboardSummary(BaseModel):
    purchase_register: float
    sales_order_count: int
    sales_register: float
    customer_payment: float


class MonthlyReportItem(BaseModel):
    month: str
    sales: float
    purchase: float


class CustomerBalanceItem(BaseModel):
    sl_no: int
    customer_name: str
    balance: float


class LowStockItem(BaseModel):
    sl_no: int
    product_code: str
    product_name: str
    code: str
    packing_size: str
    available_quantity: int
