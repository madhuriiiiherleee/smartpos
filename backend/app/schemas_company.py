from pydantic import BaseModel, ConfigDict


class CompanyProfileUpdate(BaseModel):
    company_name: str
    email: str | None = None
    website: str | None = None
    pan: str | None = None
    address_line1: str
    address_line2: str | None = None
    gstin: str
    city: str
    state: str | None = None
    pincode: str | None = None
    contact_no_1: str
    contact_no_2: str | None = None
    bank_name: str | None = None
    account_holder_name: str | None = None
    account_number: str | None = None
    ifsc_code: str | None = None
    branch: str | None = None
    invoice_declaration: str | None = None


class CompanyProfileRead(CompanyProfileUpdate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    logo_url: str | None = None
