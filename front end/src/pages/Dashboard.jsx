import { useEffect, useState } from 'react'
import { ClipboardList, Receipt, ShoppingCart } from 'lucide-react'
import { fetchLowStock, fetchPurchaseSalesReport, fetchSummary } from '../api/dashboard'
import SummaryCard from '../components/SummaryCard'
import PurchaseSalesChart from '../components/PurchaseSalesChart'
import DataTable from '../components/master/DataTable'
import { formatCurrency, formatNumber } from '../lib/format'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [chartData, setChartData] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [lowStockLoading, setLowStockLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [summaryRes, chartRes] = await Promise.all([fetchSummary(), fetchPurchaseSalesReport()])
        if (cancelled) return
        setSummary(summaryRes)
        setChartData(chartRes)
      } catch (err) {
        if (!cancelled) setError('Unable to load dashboard data. Is the API running?')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    async function loadLowStock() {
      try {
        const rows = await fetchLowStock()
        if (!cancelled) setLowStock(rows)
      } finally {
        if (!cancelled) setLowStockLoading(false)
      }
    }

    load()
    loadLowStock()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    {
      key: 'purchase_register',
      label: 'Purchase Register',
      value: summary ? formatCurrency(summary.purchase_register) : null,
      icon: ShoppingCart,
      color: 'brand-500',
    },
    {
      key: 'sales_count',
      label: 'Sales Count',
      value: summary ? formatNumber(summary.sales_count) : null,
      icon: ClipboardList,
      color: 'brand-600',
    },
    {
      key: 'sales_register',
      label: 'Sales Register',
      value: summary ? formatCurrency(summary.sales_register) : null,
      icon: Receipt,
      color: 'brand-700',
    },
  ]

  return (
    <div>
      

      <main className="space-y-6 px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Dashboard</h1>
        </div>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <SummaryCard
              key={card.key}
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
              loading={loading || !summary}
            />
          ))}
        </div>

        <div className="min-w-0">
          <PurchaseSalesChart data={chartData} loading={loading} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Top 25 Items by Available Stock
          </h2>
          <DataTable
            loading={lowStockLoading}
            rows={lowStock}
            keyField="sl_no"
            emptyMessage="No stock data available."
            columns={[
              { key: 'sl_no', label: 'SL #' },
              { key: 'product_code', label: 'Product Code' },
              { key: 'product_name', label: 'Product Name' },
              { key: 'code', label: 'Pack Code' },
              { key: 'packing_size', label: 'Packing Size' },
              { key: 'available_quantity', label: 'Available Stock', className: 'text-right' },
            ]}
            renderCell={(row, col) =>
              col.key === 'available_quantity' ? (
                <span className={`tabular-nums ${row.available_quantity <= 0 ? 'font-semibold text-rose-600' : ''}`}>
                  {formatNumber(row.available_quantity)}
                </span>
              ) : (
                row[col.key]
              )
            }
          />
        </div>
      </main>
    </div>
  )
}
