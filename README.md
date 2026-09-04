# Inventory Management System

React + Tailwind CSS frontend, FastAPI + PostgreSQL backend. Currently scoped to the Dashboard, Master Settings, Purchase, and Sales modules.

## Backend setup

1. `cd backend`
2. `.venv\Scripts\activate` (already created; re-run `python -m venv .venv` if missing)
3. Edit `backend/.env` — set `DATABASE_URL` to your real Postgres user/password. A PostgreSQL 17 server is already running locally on port 5432; use its `postgres` password, or create a dedicated role/database for this project.
4. Create the database (once): `createdb -U postgres inventory_db` (or via pgAdmin)
5. Seed sample data: `python -m app.seed`
6. Run the API: `uvicorn app.main:app --reload --port 8002`

API available at `http://127.0.0.1:8002`, docs at `/docs`. (Ports 5173/8000 are reserved for the B2B project on this machine — Inventory Management uses 5174/8002 instead so both can run at the same time.)

## Frontend setup

1. `cd "front end"`
2. `npm run dev`

App available at `http://localhost:5174`. Vite proxies `/api` requests to `http://127.0.0.1:8002`.

## Dashboard endpoints

- `GET /api/dashboard/summary` — purchase register, sales order count, sales register, customer payment
- `GET /api/dashboard/purchase-sales-report` — monthly sales vs purchase for the chart
- `GET /api/dashboard/customer-balance` — customer balance table rows

## Master Settings endpoints

Each resource below supports `GET` (list, with `q` search and `active` filter), `POST` (create),
`PUT /{id}` (update), and `PATCH /{id}/active` (toggle active status):

- `/api/master/categories`
- `/api/master/products` (also supports `category_id` filter)
- `/api/master/product-details` (also supports `product_id` filter; no active toggle)
- `/api/master/vendors`
- `/api/master/customers`

The frontend UI lives under `/master-settings` (Category, Product, Product Details, Vendor, Customer tabs),
reachable from the sidebar's "Master Settings" item.

## Purchase endpoints

- `GET /api/purchases/next-invoice-number` — preview-only invoice number for the current/given date's financial year (does not reserve it)
- `POST /api/purchases` — create a purchase (reserves the real invoice number, computes all totals server-side)
- `GET /api/purchases` — list, with `date_from`, `date_to`, `supplier_id` filters and `page`/`page_size` pagination
- `GET /api/purchases/{id}` — full detail with line items
- `PUT /api/purchases/{id}` — update (invoice number is never changed on edit)

### Invoice numbering

Financial-year-based sequential numbering, same concept as the LegalDesk B2B project: a `financial_years` table
(auto-provisioned from the document's date — India FY, April–March) and a `purchase_series_counters` table
(despite the name, shared by every numbered series — see `app/numbering.py`) holding one atomically-incremented
counter per (series, financial year). The counter is reserved via a single
`INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` statement, so concurrent saves can never collide, and a
`UNIQUE` constraint on each document table's number column is a second guard against duplicates. Numbers are
only reserved at actual save time (not when the form loads), so an abandoned entry never burns a number.

The frontend UI lives under `/purchase/manage` (Manage Purchase — list, filter, print) and `/purchase/entry`
(Purchase Entry — add; `/purchase/entry/:id` to edit), reachable from the sidebar's "Purchase" item.

## Sales endpoints

- `/api/sales` — `GET` list (`date_from`, `date_to`, `customer_id`, `sales_type`, `q` invoice search, pagination),
  `POST` create, `GET /{id}`, `PUT /{id}` update. `GET /next-invoice-number` previews the invoice number
  (format `INV/2026-27/0001`).
- `/api/sales/available-quantity?product_id=` — stock on hand, derived live as
  `purchased − (sold + free) + returned` from Purchase/Sales/Sales Return data (no separate stock table).
- `/api/sales/routes` — distinct route values already used, for the Route filter dropdowns.
- `/api/sales/delivery` — `GET` list (`route`, `sales_type`, `q` filters), `POST /delivery/mark-delivered`
  (bulk-sets `Delivered` status + today's date for the given sale ids).
- `/api/sales-orders` — same CRUD shape as `/api/sales` but with no pricing (`GET /next-order-number` previews
  format `SO/2026-27/0001`).
- `/api/sales-returns` — `GET /returnable-items?sale_id=` (each line's sold/already-returned/returnable quantity),
  `POST` create a return (validates against returnable quantity, computes totals from the *original* sale line's
  price/GST — format `SR/2026-27/0001`).

The frontend UI lives under `/sales/entry` (Sales Entry), `/sales/view` (View Sales), `/sales/order/entry`
(Sales Order), `/sales/order/view` (View Sales Order), `/sales/delivery` (Delivery List), and `/sales/return`
(Sales Return) — all reachable from the sidebar's expandable "Sales" menu.
