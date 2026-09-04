import { useEffect, useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { financialYearsApi } from '../../api/master'
import { reportsApi } from '../../api/reports'
import { FieldLabel, Select } from '../../components/master/FormField'
import { formatCurrency, formatDDMMYYYY } from '../../lib/format'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthOnlyOptions() {
  return MONTH_NAMES.map((name, i) => ({ value: String(i + 1).padStart(2, '0'), label: name }))
}

const REPORT_CONFIG = {
  'sales-b2b': {
    title: 'Sales B2B Report',
    subtitle: 'Invoice-wise sales to GST-registered customers, split by tax rate',
    fetch: reportsApi.salesB2B,
    columns: [
      { key: 'party_name', label: 'Customer Name' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'invoice_no', label: 'Invoice #' },
      { key: 'invoice_date', label: 'Invoice Date' },
    ],
  },
  'sales-b2c': {
    title: 'Sales B2C Report',
    subtitle: 'Sales to non-GST customers, summarised by state of supply and tax rate',
    fetch: reportsApi.salesB2C,
    columns: [
      { key: 'state_of_supply', label: 'State of Supply' },
      { key: 'state_code', label: 'State Code' },
    ],
  },
  'purchase-gst': {
    title: 'Purchase GST Report',
    subtitle: 'Invoice-wise purchases, split by tax rate',
    fetch: reportsApi.purchaseGst,
    columns: [
      { key: 'party_name', label: 'Vendor Name' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'invoice_no', label: 'Invoice #' },
      { key: 'invoice_date', label: 'Invoice Date' },
    ],
  },
}

const AMOUNT_COLUMNS = [
  { key: 'grand_total', label: 'Grand Total' },
  { key: 'tax_rate', label: 'Tax Rate' },
  { key: 'taxable_amount', label: 'Taxable Amount' },
  { key: 'cgst_amount', label: 'CGST Amount' },
  { key: 'sgst_amount', label: 'SGST Amount' },
]

export default function GstReportPage({ reportKey }) {
  const config = REPORT_CONFIG[reportKey]
  const monthOptions = useMemo(() => monthOnlyOptions(), [])
  const [financialYears, setFinancialYears] = useState([])
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [appliedYear, setAppliedYear] = useState('')
  const [appliedMonth, setAppliedMonth] = useState('')
  const [data, setData] = useState({ rows: [] })
  const [loading, setLoading] = useState(false)
  const [filterError, setFilterError] = useState(null)

  useEffect(() => {
    financialYearsApi.list().then((years) => {
      setFinancialYears(years)
      const active = years.find((y) => y.is_active) || years[years.length - 1]
      if (active) setYear(String(active.start_year))
    })
  }, [])

  async function load() {
    setLoading(true)
    try {
      const result = await config.fetch(appliedYear, appliedMonth)
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!appliedYear || !appliedMonth) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedYear, appliedMonth, reportKey])

  const columns = [...config.columns, ...AMOUNT_COLUMNS]

  return (
    <div>
      <header className="border-b border-brand-200 bg-brand-100">
        <div className="px-6 py-5">
          <h1 className="text-lg font-semibold text-slate-800">{config.title}</h1>
          <p className="text-sm text-slate-400">{config.subtitle}</p>
        </div>
      </header>

      <main className="space-y-4 px-6 py-6">
        <div className="rounded-2xl border-t-4 border-brand-500 bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel required>Financial Year</FieldLabel>
              <Select value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Select year</option>
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.start_year}>
                    {fy.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Select Month</FieldLabel>
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option value="">Select month</option>
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!year || !month) {
                  setFilterError('Select a Financial Year and Month.')
                  return
                }
                setFilterError(null)
                setAppliedYear(year)
                setAppliedMonth(month)
              }}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              <Search size={16} />
              Search
            </button>
            <a
              href={year && month ? reportsApi.exportUrl(reportKey, year, month) : undefined}
              onClick={(e) => {
                if (!year || !month) {
                  e.preventDefault()
                  setFilterError('Select a Financial Year and Month.')
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Download size={16} />
              Excel
            </a>
          </div>
          {filterError && <p className="mt-2 text-xs text-rose-500">{filterError}</p>}
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">SL #</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-right font-medium first:text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(!appliedYear || !appliedMonth) && !loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">
                    Select a financial year and month and click Search to view the report.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading...
                  </td>
                </tr>
              )}

              {appliedYear && appliedMonth && !loading && data.rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-400">
                    No data available for this month.
                  </td>
                </tr>
              )}

              {!loading &&
                appliedYear &&
                appliedMonth &&
                data.rows.map((row, i) => (
                  <tr key={row.sl_no} className="border-b border-slate-50 text-slate-700 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">{row.sl_no}</td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-right first:text-left tabular-nums">
                        {['grand_total', 'taxable_amount', 'cgst_amount', 'sgst_amount'].includes(col.key)
                          ? formatCurrency(row[col.key])
                          : col.key === 'tax_rate'
                            ? `${row[col.key]}%`
                            : col.key === 'invoice_date'
                              ? row[col.key]
                                ? formatDDMMYYYY(row[col.key])
                                : <span className="text-slate-300">—</span>
                              : row[col.key] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
            {!loading && appliedYear && appliedMonth && data.rows.length > 0 && (
              <tfoot>
                <tr className="bg-brand-600 text-sm font-semibold text-white">
                  <td className="px-4 py-3 text-right" colSpan={config.columns.length + 1}>
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.grand_total)}</td>
                  <td></td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.taxable_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.cgst_total)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(data.sgst_total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </div>
      </main>
    </div>
  )
}
