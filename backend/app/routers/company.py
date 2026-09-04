from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CompanyProfile
from app.schemas_company import CompanyProfileRead, CompanyProfileUpdate

router = APIRouter(prefix="/api/company-profile", tags=["company-profile"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_LOGO_TYPES = {".png", ".jpg", ".jpeg", ".webp"}
MAX_LOGO_BYTES = 5 * 1024 * 1024


def _get_or_create(db: Session) -> CompanyProfile:
    obj = db.get(CompanyProfile, 1)
    if not obj:
        obj = CompanyProfile(id=1, company_name="", address_line1="", gstin="", city="", contact_no_1="")
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj


def _read(obj: CompanyProfile) -> CompanyProfileRead:
    data = CompanyProfileRead.model_validate(obj)
    data.logo_url = f"/uploads/{obj.logo_path}" if obj.logo_path else None
    return data


@router.get("", response_model=CompanyProfileRead)
def get_profile(db: Session = Depends(get_db)):
    return _read(_get_or_create(db))


@router.put("", response_model=CompanyProfileRead)
def update_profile(payload: CompanyProfileUpdate, db: Session = Depends(get_db)):
    obj = _get_or_create(db)
    for key, value in payload.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return _read(obj)


@router.post("/logo", response_model=CompanyProfileRead)
async def upload_logo(file: UploadFile, db: Session = Depends(get_db)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_LOGO_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    contents = await file.read()
    if len(contents) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB)")

    obj = _get_or_create(db)
    old_path = obj.logo_path

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"logo_{obj.id}{ext}"
    (UPLOAD_DIR / filename).write_bytes(contents)

    if old_path and old_path != filename:
        old_file = UPLOAD_DIR / old_path
        if old_file.exists():
            old_file.unlink()

    obj.logo_path = filename
    db.commit()
    db.refresh(obj)
    return _read(obj)


@router.delete("/logo", response_model=CompanyProfileRead)
def remove_logo(db: Session = Depends(get_db)):
    obj = _get_or_create(db)
    if obj.logo_path:
        old_file = UPLOAD_DIR / obj.logo_path
        if old_file.exists():
            old_file.unlink()
        obj.logo_path = None
        db.commit()
        db.refresh(obj)
    return _read(obj)
