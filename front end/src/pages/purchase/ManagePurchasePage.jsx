import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, Search } from 'lucide-react'
import { vendorsApi } from '../../api/master'
import { purchasesApi } from '../../api/purchase'
import { companyProfileApi } from '../../api/company'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import Modal from '../../components/master/Modal'
import PurchaseInvoiceBody from '../../components/purchase/PurchaseInvoiceBody'
import { formatCurrency, formatDDMMYYYY } from '../../lib/format'

const PAGE_SIZE = 10

export default function ManagePurchasePage() {
  const [suppliers, setSuppliers] = useState([])

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE })
  const [loading, setLoading] = useState(true)

  const [company, setCompany] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    vendorsApi.list({ active: true }).then((data) => {
      setSuppliers(data)
      const defaultVendor = data.find((v) => v.name.trim().toLowerCase() === 'nandini franchise')
      if (defaultVendor) {
        setSupplierId(String(defaultVendor.id))
        setAppliedFilters((prev) => ({ ...prev, supplierId: String(defaultVendor.id) }))
      }
    })
    companyProfileApi.get().then(setCompany)
  }, [])

  async function handleView(purchaseId) {
    setViewing(null)
    setViewOpen(true)
    const data = await purchasesApi.get(purchaseId)
    setViewing(data)
  }

  function closeView() {
    setViewOpen(false)
    setViewing(null)
  }

  async function load() {
    setLoading(true)
    try {
      const data = await purchasesApi.list({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        supplier_id: appliedFilters.supplierId,
        page,
        page_size: PAGE_SIZE,
      })
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, appliedFilters])

  function handleSearch() {
    setPage(1)
    setAppliedFilters({ dateFrom, dateTo, supplierId })
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Manage Purchase</h1>
            <p className="text-sm text-slate-400">View and manage recorded purchase invoices</p>
          </div>
          <Link
            to="/purchase/entry"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Purchase
          </Link>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
        <div className="rounded-2xl border-t-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <FieldLabel>From Date</FieldLabel>
              <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <FieldLabel>To Date</FieldLabel>
              <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Vendor</FieldLabel>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">All Vendors</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                <Search size={16} />
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Invoice Date</th>
                <th className="px-5 py-3 font-medium">Vendor Name</th>
                <th className="px-5 py-3 text-right font-medium">Invoice Amount</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5" colSpan={5}>
                      <div className="h-4 w-full max-w-xs animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {!loading && result.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                    No purchases found.
                  </td>
                </tr>
              )}

              {!loading &&
                result.items.map((p, i) => (
                  <tr key={p.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium">{p.invoice_no}</td>
                    <td className="px-5 py-3.5">{formatDDMMYYYY(p.purchase_date)}</td>
                    <td className="px-5 py-3.5">{p.supplier_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(p.id)}
                          aria-label={`View ${p.invoice_no}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Eye size={16} />
                        </button>
                        <Link
                          to={`/purchase/entry/${p.id}`}
                          aria-label={`Edit ${p.invoice_no}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              Page {result.total === 0 ? 0 : page} of {totalPages} · {result.total} total
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {viewOpen && (
        <Modal title="Purchase Invoice" onClose={closeView} size="xl">
          {viewing ? (
            <PurchaseInvoiceBody purchase={viewing} company={company} />
          ) : (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          )}
        </Modal>
      )}
    </div>
  )
}
