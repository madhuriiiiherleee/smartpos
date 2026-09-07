import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CornerDownLeft, Eye, Plus, Search } from 'lucide-react'
import { customersApi } from '../../api/master'
import { extractErrorMessage, salesApi, salesReturnsApi } from '../../api/sales'
import Modal from '../../components/master/Modal'
import SearchableSelect from '../../components/master/SearchableSelect'
import AlertDialog from '../../components/shared/AlertDialog'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import { FieldLabel, TextInput } from '../../components/master/FormField'
import { formatCurrency3, formatDDMMYYYY, today } from '../../lib/format'

const HISTORY_PAGE_SIZE = 10

function qtyPriceTaxable(item) {
  const gross = Number(item.price) * (1 - (Number(item.discount_percent) || 0) / 100)
  return item.price_inc_gst ? gross / (1 + Number(item.gst_percent) / 100) : gross
}

export default function SalesReturnPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('invoice') || '')
  const [newReturnOpen, setNewReturnOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [matches, setMatches] = useState([])
  const [searchError, setSearchError] = useState(null)

  const [sale, setSale] = useState(null)
  const [returnDate, setReturnDate] = useState(today())
  const [dateError, setDateError] = useState(null)
  const [returnableItems, setReturnableItems] = useState([])
  const [quantities, setQuantities] = useState({})

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedReturn, setSavedReturn] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resultDialog, setResultDialog] = useState(null)

  // ---- Return History ----
  const [historyCustomers, setHistoryCustomers] = useState([])
  const [historyDateFrom, setHistoryDateFrom] = useState('')
  const [historyDateTo, setHistoryDateTo] = useState('')
  const [historyCustomerId, setHistoryCustomerId] = useState('')
  const [historyQ, setHistoryQ] = useState('')
  const [historyAppliedFilters, setHistoryAppliedFilters] = useState({})
  const [historyPage, setHistoryPage] = useState(1)
  const [historyResult, setHistoryResult] = useState({ items: [], total: 0 })
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyViewOpen, setHistoryViewOpen] = useState(false)
  const [historyViewing, setHistoryViewing] = useState(null)

  useEffect(() => {
    customersApi.list({ active: true }).then(setHistoryCustomers)
  }, [])

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const data = await salesReturnsApi.list({
        date_from: historyAppliedFilters.dateFrom,
        date_to: historyAppliedFilters.dateTo,
        customer_id: historyAppliedFilters.customerId,
        q: historyAppliedFilters.q,
        page: historyPage,
        page_size: HISTORY_PAGE_SIZE,
      })
      setHistoryResult(data)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, historyAppliedFilters])

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistoryPage(1)
      setHistoryAppliedFilters({
        dateFrom: historyDateFrom,
        dateTo: historyDateTo,
        customerId: historyCustomerId,
        q: historyQ,
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [historyDateFrom, historyDateTo, historyCustomerId, historyQ])

  async function handleHistoryView(returnId) {
    setHistoryViewing(null)
    setHistoryViewOpen(true)
    const data = await salesReturnsApi.get(returnId)
    setHistoryViewing(data)
  }

  function closeHistoryView() {
    setHistoryViewOpen(false)
    setHistoryViewing(null)
  }

  const historyTotalPages = Math.max(1, Math.ceil(historyResult.total / HISTORY_PAGE_SIZE))

  // ---- Search / process a return ----

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setSavedReturn(null)
    try {
      const result = await salesApi.list({ q: query.trim(), page: 1, page_size: 10 })
      if (result.items.length === 0) {
        setSearchError('No sales found for that invoice number.')
        setMatches([])
      } else {
        const exact = result.items.find((i) => i.invoice_no === query.trim()) || (result.items.length === 1 ? result.items[0] : null)
        if (exact) {
          handleSelectSale(exact)
        } else {
          setMatches(result.items)
        }
      }
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectSale(item) {
    setSale(item)
    setMatches([])
    setError(null)
    setDateError(null)
    setReturnDate(item.sale_date > today() ? item.sale_date : today())
    const items = await salesReturnsApi.returnableItems(item.id)
    setReturnableItems(items)
    setQuantities({})
  }

  function handleReturnDateChange(value) {
    setReturnDate(value)
    setDateError(sale && value < sale.sale_date ? 'Return date cannot be earlier than the original sale date.' : null)
  }

  useEffect(() => {
    const invoiceParam = searchParams.get('invoice')
    if (!invoiceParam) return
    salesApi.list({ q: invoiceParam, page: 1, page_size: 5 }).then((result) => {
      const exact = result.items.find((i) => i.invoice_no === invoiceParam)
      if (exact) handleSelectSale(exact)
      else {
        setMatches(result.items)
        if (result.items.length > 0) setNewReturnOpen(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuantityChange(saleItemId, value) {
    setQuantities((prev) => ({ ...prev, [saleItemId]: value }))
  }

  const lines = returnableItems
    .map((item) => {
      const qty = Number(quantities[item.sale_item_id]) || 0
      // Use the backend-computed per-unit taxable/GST (already price_inc_gst-
      // and discount-aware) so the preview always matches the saved credit note.
      const unitTaxable = item.unit_taxable ?? qtyPriceTaxable(item)
      const gst = qty * (item.unit_gst ?? unitTaxable * item.gst_percent / 100)
      const taxable = qty * unitTaxable
      const grand = taxable + gst
      return { ...item, qty, taxable, gst, grand }
    })
    .filter((l) => l.qty > 0)

  const taxableTotal = lines.reduce((sum, l) => sum + l.taxable, 0)
  const gstTotal = lines.reduce((sum, l) => sum + l.gst, 0)
  const grandTotal = lines.reduce((sum, l) => sum + l.grand, 0)

  function handleSave() {
    setError(null)
    if (sale && returnDate < sale.sale_date) {
      setDateError('Return date cannot be earlier than the original sale date.')
      return
    }
    if (lines.length === 0) {
      setError('Enter a return quantity for at least one product.')
      return
    }
    setConfirmOpen(true)
  }

  async function doSave() {
    setConfirmOpen(false)
    setSaving(true)
    try {
      const result = await salesReturnsApi.create({
        sale_id: sale.id,
        return_date: returnDate,
        items: lines.map((l) => ({ sale_item_id: l.sale_item_id, quantity: l.qty })),
      })
      setSavedReturn(result)
      setNewReturnOpen(false)
      setSale(null)
      setReturnableItems([])
      setQuantities({})
      setQuery('')
      setHistoryPage(1)
      setHistoryAppliedFilters({})
      await loadHistory()
      setResultDialog({
        variant: 'success',
        title: 'Sales Return Saved Successfully',
        message: `Return ${result.return_no} has been saved successfully against invoice ${result.invoice_no}.`,
      })
    } catch (err) {
      setResultDialog({
        variant: 'error',
        title: 'Failed to Save Sales Return',
        message: extractErrorMessage(err),
      })
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      

      <main className="space-y-5 px-6 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Sales Return</h1>
          {!sale && (
            <button
              type="button"
              onClick={() => setNewReturnOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#103252] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0c263e]"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Return
            </button>
          )}
        </div>
        {savedReturn && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Return <span className="font-semibold">{savedReturn.return_no}</span> saved against invoice{' '}
            <span className="font-semibold">{savedReturn.invoice_no}</span> — total{' '}
            {formatCurrency3(savedReturn.amount)}.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {newReturnOpen && (
          <Modal 
            size={sale ? 'xl' : undefined} 
            title={sale ? 'Process Sales Return' : 'Find Sale by Invoice Number'} 
            onClose={() => {
              setNewReturnOpen(false)
              setSale(null)
              setReturnableItems([])
              setDateError(null)
            }}
          >
            {!sale ? (
              <div className="p-1">
                <p className="mb-4 text-sm text-slate-500">
                  Enter the original sales invoice number (e.g. INV/...) to process a brand new return.
                </p>
                <div className="flex gap-2">
                  <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="e.g. INV/2026-27/0001"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    <Search size={16} />
                    Find
                  </button>
                </div>

                {searchError && <p className="mt-2 text-xs text-rose-500">{searchError}</p>}

                {matches.length > 0 && (
                  <div className="mt-4 divide-y divide-slate-50 overflow-hidden rounded-xl border border-slate-100 max-h-64 overflow-y-auto">
                    {matches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectSale(m)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-50"
                      >
                        <span>
                          <span className="font-medium text-slate-700">{m.invoice_no}</span>
                          <span className="ml-2 text-slate-400">{m.customer_name}</span>
                        </span>
                        <span className="flex items-center gap-4 text-slate-500">
                          {formatDDMMYYYY(m.sale_date)}
                          <span className="font-semibold tabular-nums text-slate-700">{formatCurrency3(m.amount)}</span>
                          <span className="flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700">
                            <Eye size={14} />
                            Select
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 p-1">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-900/5">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Returning against</p>
                    <p className="mt-1 text-base font-semibold text-slate-800">
                      {sale.invoice_no} <span className="font-normal text-slate-400">· {sale.customer_name}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <FieldLabel>Return Date</FieldLabel>
                      <TextInput
                        type="date"
                        value={returnDate}
                        min={sale.sale_date}
                        onChange={(e) => handleReturnDateChange(e.target.value)}
                        className={dateError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}
                      />
                      {dateError && <p className="mt-1 text-xs text-rose-500">{dateError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSale(null)
                        setReturnableItems([])
                        setDateError(null)
                      }}
                      className="mt-6 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      <CornerDownLeft size={14} />
                      Back
                    </button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 text-right font-medium">Sold Qty</th>
                          <th className="px-4 py-3 text-right font-medium">Already Returned</th>
                          <th className="px-4 py-3 text-right font-medium">Returnable</th>
                          <th className="px-4 py-3 text-right font-medium">Return Qty</th>
                          <th className="px-4 py-3 text-right font-medium">Return Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnableItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                              This sale has no returnable products.
                            </td>
                          </tr>
                        )}
                        {returnableItems.map((item) => {
                          const qty = Number(quantities[item.sale_item_id]) || 0
                          const unitTaxable = item.unit_taxable ?? qtyPriceTaxable(item)
                          const unitGst = item.unit_gst ?? (unitTaxable * item.gst_percent) / 100
                          const grand = qty * (unitTaxable + unitGst)
                          return (
                            <tr key={item.sale_item_id} className="border-b border-slate-100 text-slate-700 last:border-0 hover:bg-slate-50/60">
                              <td className="px-4 py-3 font-medium">{item.product_name}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{item.sold_quantity} pcs</td>
                              <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                {item.already_returned_quantity} pcs
                              </td>
                              <td className="px-4 py-3 text-right tabular-nums">{item.returnable_quantity} pcs</td>
                              <td className="px-4 py-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.returnable_quantity}
                                  disabled={item.returnable_quantity === 0}
                                  value={quantities[item.sale_item_id] || ''}
                                  onChange={(e) => handleQuantityChange(item.sale_item_id, e.target.value)}
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums text-brand-600">
                                {formatCurrency3(grand)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col items-stretch gap-4 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Taxable Amount</p>
                      <p className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">
                        {formatCurrency3(taxableTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">GST Amount</p>
                      <p className="mt-1 text-lg font-semibold text-slate-800 tabular-nums">{formatCurrency3(gstTotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Return Total</p>
                      <p className="mt-1 text-xl font-bold text-brand-600 tabular-nums">{formatCurrency3(grandTotal)}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Return'}
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )}

        {/* ---- Return History ---- */}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div>
              <FieldLabel>From Date</FieldLabel>
              <TextInput type="date" value={historyDateFrom} onChange={(e) => setHistoryDateFrom(e.target.value)} />
            </div>
            <div>
              <FieldLabel>To Date</FieldLabel>
              <TextInput type="date" value={historyDateTo} onChange={(e) => setHistoryDateTo(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Customer</FieldLabel>
              <SearchableSelect
                value={historyCustomerId}
                onChange={setHistoryCustomerId}
                options={[
                  { value: '', label: 'All Customers' },
                  ...historyCustomers.map((c) => ({ value: c.id, label: c.name })),
                ]}
                placeholder="All Customers"
              />
            </div>
            <div>
              <FieldLabel>Search Return # / Invoice #</FieldLabel>
              <TextInput
                value={historyQ}
                onChange={(e) => setHistoryQ(e.target.value)}

                placeholder="e.g. SR/2026-27/0001"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#103252] text-xs uppercase tracking-wide text-white">
                  <th className="px-5 py-3 font-medium">Return No.</th>
                  <th className="px-5 py-3 font-medium">Invoice No.</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Return Date</th>
                  <th className="px-5 py-3 text-right font-medium">Return Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5" colSpan={6}>
                        <div className="h-4 w-full max-w-xs animate-pulse rounded bg-slate-100" />
                      </td>
                    </tr>
                  ))}

                {!historyLoading && historyResult.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                      No sales returns found.
                    </td>
                  </tr>
                )}

                {!historyLoading &&
                  historyResult.items.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-medium">{r.return_no}</td>
                      <td className="px-5 py-3.5">{r.invoice_no || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5">{r.customer_name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5">{formatDDMMYYYY(r.return_date)}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">{formatCurrency3(r.amount)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleHistoryView(r.id)}
                          aria-label={`View ${r.return_no}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100"
                        >
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              Page {historyResult.total === 0 ? 0 : historyPage} of {historyTotalPages} · {historyResult.total} total
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={historyPage >= historyTotalPages}
                onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {historyViewOpen && (
        <Modal
          title="Sales Return"
          onClose={closeHistoryView}
          size="xl"
          footer={
            <button
              type="button"
              onClick={closeHistoryView}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Close
            </button>
          }
        >
          {historyViewing ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Return No.</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{historyViewing.return_no}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Against Invoice</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{historyViewing.invoice_no || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Customer</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{historyViewing.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Return Date</p>
                  <p className="mt-1 text-base font-semibold text-slate-800">{formatDDMMYYYY(historyViewing.return_date)}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#103252] text-xs uppercase tracking-wide text-white">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                      <th className="px-4 py-2.5 text-right font-medium">Taxable</th>
                      <th className="px-4 py-2.5 text-right font-medium">GST</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyViewing.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 text-slate-700 last:border-0">
                        <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity} pcs</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency3(item.taxable_amount)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency3(item.gst_amount)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                          {formatCurrency3(item.grand_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-8 rounded-xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Taxable Amount</p>
                  <p className="mt-1 font-semibold text-slate-800 tabular-nums">{formatCurrency3(historyViewing.taxable_amount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">GST Amount</p>
                  <p className="mt-1 font-semibold text-slate-800 tabular-nums">{formatCurrency3(historyViewing.gst_amount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Return Total</p>
                  <p className="mt-1 text-lg font-bold text-brand-600 tabular-nums">{formatCurrency3(historyViewing.amount)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          )}
        </Modal>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Save Sales Return?"
        message="Are you sure you want to save this sales return?"
        confirmLabel="Save Return"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={doSave}
        busy={saving}
      />
      <AlertDialog
        open={resultDialog != null}
        variant={resultDialog?.variant ?? 'success'}
        title={resultDialog?.title ?? ''}
        message={resultDialog?.message ?? ''}
        onClose={() => setResultDialog(null)}
      />
    </div>
  )
}
