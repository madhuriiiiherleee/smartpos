import { useEffect, useState } from 'react'
import { CheckCheck, Printer, Search } from 'lucide-react'
import { salesApi } from '../../api/sales'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { DELIVERY_STATUSES } from '../../lib/constants'

export default function DeliveryListPage() {
  const [routes, setRoutes] = useState([])
  const [route, setRoute] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [q, setQ] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    salesApi.routes().then(setRoutes)
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await salesApi.delivery({
        route: appliedFilters.route,
        delivery_status: appliedFilters.deliveryStatus,
        q: appliedFilters.q,
      })
      setItems(data.items)
      setSelected(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [appliedFilters])

  function handleSearch() {
    setAppliedFilters({ route, deliveryStatus, q })
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function handleMarkDelivered() {
    if (selected.size === 0) return
    setMarking(true)
    try {
      const data = await salesApi.markDelivered(Array.from(selected))
      setItems(data.items)
      setSelected(new Set())
    } finally {
      setMarking(false)
    }
  }

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">Delivery List</h1>
          <p className="text-sm text-slate-400">Track and print deliveries for sales invoices</p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6 print:px-[12mm]">
        <div className="rounded-2xl border-t-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5 print:hidden">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div>
              <FieldLabel>Route</FieldLabel>
              <Select value={route} onChange={(e) => setRoute(e.target.value)}>
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)}>
                <option value="">All</option>
                {DELIVERY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-2">
              <FieldLabel>Search Invoice #</FieldLabel>
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. INV/2026-27/0001" />
            </div>
            <div className="flex items-end gap-2">
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

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 print:hidden">
            <span>{selected.size} invoice(s) selected</span>
            <button
              type="button"
              onClick={handleMarkDelivered}
              disabled={marking}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              <CheckCheck size={14} />
              {marking ? 'Updating...' : 'Mark Delivered'}
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium print:hidden">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 accent-brand-600 focus:ring-brand-400"
                  />
                </th>
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Customer Name</th>
                <th className="px-5 py-3 font-medium">Delivery Status</th>
                <th className="px-5 py-3 font-medium">Delivery Date</th>
                <th className="px-5 py-3 font-medium">Payment Type</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3.5" colSpan={6}>
                      <div className="h-4 w-full max-w-xs animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                    No deliveries found.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((item, i) => (
                  <tr key={item.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 print:hidden">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-brand-600 focus:ring-brand-400"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-medium">{item.invoice_no}</td>
                    <td className="px-5 py-3.5">{item.customer_name || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          item.delivery_status === 'Delivered'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-brand-50 text-brand-600'
                        }`}
                      >
                        {item.delivery_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{item.delivery_date || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">{item.payment_type}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </div>
  )
}
