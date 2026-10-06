import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ClipboardCheck, History, Search } from 'lucide-react'
import { categoriesApi } from '../../api/master'
import { stockAdjustmentsApi } from '../../api/stock'
import { FieldLabel, Select, TextInput } from '../../components/master/FormField'
import { formatBoxBreakdown, formatDDMMYYYY } from '../../lib/format'

const today = () => new Date().toISOString().slice(0, 10)

// A row is "counted" once either box or loose has been typed — blank means
// "not counted, leave stock alone", while an explicit 0 means "counted, none on shelf".
function isCounted(entry) {
  return entry && (entry.boxes !== '' || entry.loose !== '')
}

function physicalQty(entry, qtyPerBox) {
  return (Number(entry.boxes) || 0) * (qtyPerBox || 1) + (Number(entry.loose) || 0)
}

function Diff({ value }) {
  const cls = value > 0 ? 'text-emerald-600' : value < 0 ? 'text-rose-600' : 'text-slate-400'
  return <span className={`font-semibold tabular-nums ${cls}`}>{value > 0 ? `+${value}` : value}</span>
}

function Qty({ value, qtyPerBox }) {
  const breakdown = formatBoxBreakdown(Math.max(value, 0), qtyPerBox)
  return (
    <div className="text-right">
      <div className={`font-semibold tabular-nums ${value < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{value}</div>
      {breakdown && value > 0 && <div className="text-xs text-slate-400">{breakdown}</div>}
    </div>
  )
}

function NewCount({ onPosted }) {
  const [rows, setRows] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [onlyCounted, setOnlyCounted] = useState(false)
  const [entries, setEntries] = useState({})
  const [adjustmentDate, setAdjustmentDate] = useState(today())
  const [reason, setReason] = useState('Physical stock count')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  function loadSheet() {
    setLoading(true)
    return stockAdjustmentsApi
      .sheet()
      .then(setRows)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    categoriesApi.list({ active: true }).then(setCategories)
    loadSheet()
  }, [])

  const categoryName = categories.find((c) => c.id === Number(categoryId))?.name
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (!categoryName || r.category_name === categoryName) &&
        (!q || `${r.product_name} ${r.code} ${r.packing_size}`.toLowerCase().includes(q)) &&
        (!onlyCounted || isCounted(entries[r.product_detail_id])),
    )
  }, [rows, categoryName, search, onlyCounted, entries])

  const counted = rows
    .filter((r) => isCounted(entries[r.product_detail_id]))
    .map((r) => {
      const entry = entries[r.product_detail_id]
      const physical = physicalQty(entry, r.qty_per_box)
      return { ...r, boxes: Number(entry.boxes) || 0, loose: Number(entry.loose) || 0, physical, difference: physical - r.system_qty }
    })

  function setEntry(id, field, raw) {
    const value = raw.replace(/[^\d]/g, '')
    setEntries((prev) => {
      const current = prev[id] || { boxes: '', loose: '' }
      return { ...prev, [id]: { ...current, [field]: value } }
    })
  }

  async function handlePost() {
    setPosting(true)
    setError('')
    try {
      const saved = await stockAdjustmentsApi.create({
        adjustment_date: adjustmentDate,
        reason,
        remarks: remarks || null,
        items: counted.map((r) => ({
          product_detail_id: r.product_detail_id,
          physical_boxes: r.boxes,
          physical_loose: r.loose,
        })),
      })
      setEntries({})
      setReviewing(false)
      onPosted(saved.id)
    } catch (err) {
      setError(err?.response?.data?.detail?.toString() || 'Could not post the adjustment.')
      // Stock may have moved since the sheet loaded — refresh so the review reflects it.
      loadSheet()
    } finally {
      setPosting(false)
    }
  }

  if (reviewing) {
    const net = counted.reduce((s, r) => s + r.difference, 0)
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-t-4 border-amber-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <h2 className="text-base font-semibold text-slate-800">Review before posting</h2>
          <p className="mt-1 text-sm text-slate-500">
            {counted.length} pack size(s) will be set to the counted quantity on {formatDDMMYYYY(adjustmentDate)}. Net change:{' '}
            <Diff value={net} /> pieces. Posted adjustments cannot be edited — a mistake is fixed by posting another count.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Differences are recalculated by the server against live stock at the moment you post.
          </p>
          {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>
        <CountTable rows={counted} readOnly />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to edit
          </button>
          <button
            type="button"
            disabled={posting}
            onClick={handlePost}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {posting ? 'Posting…' : `Post ${counted.length} line(s)`}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-t-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <FieldLabel required>Count Date</FieldLabel>
            <TextInput type="date" value={adjustmentDate} onChange={(e) => setAdjustmentDate(e.target.value)} />
          </div>
          <div>
            <FieldLabel required>Reason</FieldLabel>
            <TextInput value={reason} maxLength={100} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Remarks</FieldLabel>
            <TextInput value={remarks} placeholder="e.g. Handwritten count sheet, 74 lines" onChange={(e) => setRemarks(e.target.value)} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Search</FieldLabel>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <TextInput className="pl-9" value={search} placeholder="Product, pack code or size" onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyCounted} onChange={(e) => setOnlyCounted(e.target.checked)} />
            Show counted only
          </label>
        </div>
      </div>

      <CountTable rows={visible} entries={entries} onChange={setEntry} loading={loading} />

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <span className="text-sm text-slate-600">
          <strong>{counted.length}</strong> pack size(s) counted. Blank rows are left unchanged.
        </span>
        <button
          type="button"
          disabled={counted.length === 0 || !adjustmentDate || !reason.trim()}
          onClick={() => {
            setError('')
            setReviewing(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          <ClipboardCheck size={16} />
          Review &amp; Post
        </button>
      </div>
    </div>
  )
}

function CountTable({ rows, entries, onChange, loading, readOnly }) {
  const inputCls =
    'w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm tabular-nums focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100'
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Pack Code</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 text-right font-medium">Qty/Box</th>
              <th className="px-4 py-3 text-right font-medium">System Stock (pcs)</th>
              <th className="px-4 py-3 text-right font-medium">Boxes</th>
              <th className="px-4 py-3 text-right font-medium">Loose Pcs</th>
              <th className="px-4 py-3 text-right font-medium">Physical (pcs)</th>
              <th className="px-4 py-3 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Loading stock…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  No pack sizes to show.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => {
                const entry = readOnly ? { boxes: String(r.boxes), loose: String(r.loose) } : entries[r.product_detail_id]
                const counted = isCounted(entry)
                const physical = counted ? physicalQty(entry, r.qty_per_box) : null
                return (
                  <tr key={r.product_detail_id} className={`border-b border-slate-50 last:border-0 ${counted ? 'bg-brand-50/40' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-700">{r.product_name}</div>
                      <div className="text-xs text-slate-400">{r.category_name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.code}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.packing_size}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.qty_per_box}</td>
                    <td className="px-4 py-2.5">
                      <Qty value={r.system_qty} qtyPerBox={r.qty_per_box} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {readOnly ? (
                        <span className="tabular-nums">{r.boxes}</span>
                      ) : (
                        <input
                          inputMode="numeric"
                          className={inputCls}
                          value={entry?.boxes ?? ''}
                          onChange={(e) => onChange(r.product_detail_id, 'boxes', e.target.value)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {readOnly ? (
                        <span className="tabular-nums">{r.loose}</span>
                      ) : (
                        <input
                          inputMode="numeric"
                          className={inputCls}
                          value={entry?.loose ?? ''}
                          onChange={(e) => onChange(r.product_detail_id, 'loose', e.target.value)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-700">{counted ? physical : '—'}</td>
                    <td className="px-4 py-2.5 text-right">{counted ? <Diff value={physical - r.system_qty} /> : '—'}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HistoryList({ onOpen }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    stockAdjustmentsApi.list({ page_size: 100 }).then(setData)
  }, [])
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Adjustment No</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Reason</th>
              <th className="px-5 py-3 font-medium">Posted By</th>
              <th className="px-5 py-3 text-right font-medium">Lines</th>
              <th className="px-5 py-3 text-right font-medium">Net Change (pcs)</th>
            </tr>
          </thead>
          <tbody>
            {!data && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No stock adjustments posted in this financial year.
                </td>
              </tr>
            )}
            {data?.items.map((a) => (
              <tr key={a.id} onClick={() => onOpen(a.id)} className="cursor-pointer border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-3 font-medium text-brand-700">{a.adjustment_no}</td>
                <td className="px-5 py-3">{formatDDMMYYYY(a.adjustment_date)}</td>
                <td className="px-5 py-3">
                  {a.reason}
                  {a.remarks && <div className="text-xs text-slate-400">{a.remarks}</div>}
                </td>
                <td className="px-5 py-3">{a.created_by || '—'}</td>
                <td className="px-5 py-3 text-right tabular-nums">{a.item_count}</td>
                <td className="px-5 py-3 text-right">
                  <Diff value={a.net_difference} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdjustmentDetail({ id, onBack }) {
  const [adj, setAdj] = useState(null)
  useEffect(() => {
    stockAdjustmentsApi.get(id).then(setAdj)
  }, [id])
  if (!adj) return <p className="text-sm text-slate-400">Loading…</p>
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowLeft size={14} /> Back to history
      </button>
      <div className="rounded-2xl border-t-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-base font-semibold text-slate-800">{adj.adjustment_no}</h2>
        <p className="text-sm text-slate-500">
          {formatDDMMYYYY(adj.adjustment_date)} · {adj.reason} · posted by {adj.created_by || '—'}
        </p>
        {adj.remarks && <p className="mt-1 text-sm text-slate-500">{adj.remarks}</p>}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Pack Code</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 text-right font-medium">Qty/Box</th>
                <th className="px-4 py-3 text-right font-medium">System (pcs)</th>
                <th className="px-4 py-3 text-right font-medium">Counted</th>
                <th className="px-4 py-3 text-right font-medium">Physical (pcs)</th>
                <th className="px-4 py-3 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {adj.items.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 text-slate-700 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{i.product_name}</td>
                  <td className="px-4 py-2.5">{i.code}</td>
                  <td className="px-4 py-2.5">{i.packing_size}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{i.qty_per_box}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{i.system_qty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {i.physical_boxes} box + {i.physical_loose} pcs
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{i.physical_qty}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Diff value={i.difference_qty} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function StockAdjustmentPage() {
  const [tab, setTab] = useState('new')
  const [openId, setOpenId] = useState(null)

  const tabCls = (active) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Stock Adjustment</h1>
            <p className="text-sm text-slate-400">Set system stock to a physical count — invoices are not touched</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-brand-200/50 p-1">
            <button type="button" className={tabCls(tab === 'new')} onClick={() => setTab('new')}>
              <ClipboardCheck size={15} /> New Count
            </button>
            <button
              type="button"
              className={tabCls(tab === 'history')}
              onClick={() => {
                setTab('history')
                setOpenId(null)
              }}
            >
              <History size={15} /> History
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        {tab === 'new' && (
          <NewCount
            onPosted={(id) => {
              setTab('history')
              setOpenId(id)
            }}
          />
        )}
        {tab === 'history' && !openId && <HistoryList onOpen={setOpenId} />}
        {tab === 'history' && openId && <AdjustmentDetail id={openId} onBack={() => setOpenId(null)} />}
      </main>
    </div>
  )
}
