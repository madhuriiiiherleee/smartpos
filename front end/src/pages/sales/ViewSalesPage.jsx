import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
  Download,
  Eye,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react'
import { customersApi } from '../../api/master'
import { companyProfileApi } from '../../api/company'
import { extractErrorMessage, salesApi } from '../../api/sales'
import Modal from '../../components/master/Modal'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import SearchableSelect from '../../components/master/SearchableSelect'
import SalesInvoiceBody from '../../components/sales/SalesInvoiceBody'
import { FieldLabel, TextInput } from '../../components/master/FormField'
import { formatCurrency, formatDDMMYYYY } from '../../lib/format'
import { withBase } from '../../lib/url'

function invoiceUrl(id, size) {
  const path = withBase(`sales/invoice/${id}`)
  return `${path}?autoprint=1&size=${size}`
}

const PAGE_SIZE = 10

export default function ViewSalesPage() {
  const [customers, setCustomers] = useState([])

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [q, setQ] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [listNotice, setListNotice] = useState(null)
  const [printSize, setPrintSize] = useState('A4')
  const [printTarget, setPrintTarget] = useState(null)
  const [printModalSize, setPrintModalSize] = useState('A4')

  const [company, setCompany] = useState(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    customersApi.list({ active: true }).then(setCustomers)
    companyProfileApi.get().then(setCompany)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await salesApi.list({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        customer_id: appliedFilters.customerId,
        q: appliedFilters.q,
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setAppliedFilters({ dateFrom, dateTo, customerId, q })
    }, 300)
    return () => clearTimeout(timer)
  }, [dateFrom, dateTo, customerId, q])

  async function handleDelete(sale) {
    setDeleteTarget(sale)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const sale = deleteTarget
    setDeleteTarget(null)
    setListError(null)
    setListNotice(null)
    try {
      await salesApi.remove(sale.id)
      const data = await salesApi.list({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        customer_id: appliedFilters.customerId,
        q: appliedFilters.q,
        page,
        page_size: PAGE_SIZE,
      })
      const maxPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
      if (page > maxPage) {
        setPage(maxPage)
      } else {
        setResult(data)
      }
    } catch (err) {
      setListError(extractErrorMessage(err))
    }
  }

  async function handleView(saleId) {
    setViewing(null)
    setViewOpen(true)
    const data = await salesApi.get(saleId)
    setViewing(data)
  }

  function closeView() {
    setViewOpen(false)
    setViewing(null)
  }

  function openPrintModal(target) {
    setPrintModalSize('A4')
    setPrintTarget(target)
  }

  function handleConfirmPrint() {
    const target = printTarget
    setPrintTarget(null)
    if (target === 'list') {
      setPrintSize(printModalSize)
      setTimeout(() => window.print(), 150)
    } else if (target) {
      window.open(invoiceUrl(target.id, printModalSize), '_blank')
    }
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div className={printSize === 'A5' ? 'invoice-print-a5' : 'invoice-print-a4'}>
      <h1 className="hidden px-1 pb-3 text-lg font-semibold text-slate-800 print:block uppercase tracking-wide">Sales Invoices</h1>

      <main className="space-y-4 px-6 py-6 print:space-y-0 print:p-[12mm]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">View Sales</h1>
          <Link
            to="/sales/entry"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Sale
          </Link>
        </div>
        {listError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {listError}
          </div>
        )}
        {listNotice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {listNotice}
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 print:hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div>
              <FieldLabel>From Date</FieldLabel>
              <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <FieldLabel>To Date</FieldLabel>
              <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Customer</FieldLabel>
              <SearchableSelect
                value={customerId}
                onChange={setCustomerId}
                options={[{ value: '', label: 'All Customers' }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                placeholder="All Customers"
              />
            </div>
            <div>
              <FieldLabel>Search Invoice #</FieldLabel>
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. INV/2026-27/0001" />
            </div>
            <div className="flex items-end gap-2 xl:col-span-2">

              <button
                type="button"
                onClick={() => openPrintModal('list')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 print:overflow-visible print:rounded-none print:shadow-none print:ring-0">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-600 text-xs uppercase tracking-wide text-white">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 text-right font-medium">Invoice Amount</th>
                <th className="px-5 py-3 font-medium">Customer Name</th>
                <th className="px-5 py-3 font-medium">Sales Date</th>
                <th className="px-5 py-3 text-right font-medium print:hidden">Action</th>
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
                    No sales found.
                  </td>
                </tr>
              )}

              {!loading &&
                result.items.map((s, i) => (
                  <tr key={s.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium">{s.invoice_no}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatCurrency(s.amount)}</td>
                    <td className="px-5 py-3.5">{s.customer_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">{formatDDMMYYYY(s.sale_date)}</td>
                    <td className="px-5 py-3.5 text-right print:hidden">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/sales/entry/${s.id}`}
                          aria-label={`Edit ${s.invoice_no}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          <Pencil size={14} /> Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          aria-label={`Delete ${s.invoice_no}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => handleView(s.id)}
                          aria-label={`View ${s.invoice_no}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                        >
                          <Eye size={14} /> View
                        </button>
                        <Link
                          to={`/sales/return?invoice=${encodeURIComponent(s.invoice_no)}`}
                          aria-label={`Credit note for ${s.invoice_no}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <CornerUpLeft size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openPrintModal(s)}
                          aria-label={`Print ${s.invoice_no}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                        >
                          <Printer size={14} /> Print
                        </button>
                        <Link
                          to={`/sales/invoice/${s.id}?autoprint=1`}
                          target="_blank"
                          aria-label={`Download ${s.invoice_no}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Download size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500 print:hidden">
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

      {printTarget && (
        <Modal
          title="Print Invoice"
          onClose={() => setPrintTarget(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPrint}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Printer size={16} />
                Print
              </button>
            </>
          }
        >
          <FieldLabel>Select Paper Size</FieldLabel>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {['A4', 'A5'].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setPrintModalSize(size)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  printModalSize === size
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {viewOpen && (
        <Modal title="Sales Invoice" onClose={closeView} size="xl">
          {viewing ? (
            <SalesInvoiceBody sale={viewing} company={company} />
          ) : (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete Invoice?"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.invoice_no}"? This action cannot be undone.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
