import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pencil, Plus, Printer, Search } from 'lucide-react'
import { customersApi } from '../../api/master'
import { salesOrdersApi } from '../../api/sales'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { SALES_TYPES } from '../../lib/constants'

const PAGE_SIZE = 10

export default function ViewSalesOrderPage() {
  const [customers, setCustomers] = useState([])

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [salesType, setSalesType] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customersApi.list({ active: true }).then(setCustomers)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await salesOrdersApi.list({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        customer_id: appliedFilters.customerId,
        sales_type: appliedFilters.salesType,
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
    setAppliedFilters({ dateFrom, dateTo, customerId, salesType })
  }

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  return (
    <div>
      <main className="space-y-4 px-6 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">View Sales Order</h1>
          <Link
            to="/sales/order/entry"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#103252] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0c263e]"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Order
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
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
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">All Customers</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Sales Type</FieldLabel>
              <Select value={salesType} onChange={(e) => setSalesType(e.target.value)}>
                <option value="">All Types</option>
                {SALES_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2 xl:col-span-2">
              <button
                type="button"
                onClick={handleSearch}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                <Search size={16} />
                Search
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Order #</th>
                <th className="px-5 py-3 font-medium">Customer Name</th>
                <th className="px-5 py-3 font-medium">Sales Type</th>
                <th className="px-5 py-3 font-medium">Order Date</th>
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
                    No sales orders found.
                  </td>
                </tr>
              )}

              {!loading &&
                result.items.map((o, i) => (
                  <tr key={o.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-medium">{o.order_no}</td>
                    <td className="px-5 py-3.5">{o.customer_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">{o.sales_type || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">{o.order_date}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/sales/order/entry/${o.id}`}
                        aria-label={`Edit ${o.order_no}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Pencil size={16} />
                      </Link>
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
    </div>
  )
}
