from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth import get_current_user
from app.config import settings
from app.database import Base, engine
from app.routers import auth, company, dashboard, master, purchase, reports, sales, sales_order, sales_return
from app.routers.company import UPLOAD_DIR

Base.metadata.create_all(bind=engine)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Inventory Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

protected = [Depends(get_current_user)]

app.include_router(auth.router)
app.include_router(dashboard.router, dependencies=protected)
app.include_router(master.router, dependencies=protected)
app.include_router(purchase.router, dependencies=protected)
app.include_router(sales.router, dependencies=protected)
app.include_router(sales_order.router, dependencies=protected)
app.include_router(sales_return.router, dependencies=protected)
app.include_router(company.router, dependencies=protected)
app.include_router(reports.router, dependencies=protected)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
