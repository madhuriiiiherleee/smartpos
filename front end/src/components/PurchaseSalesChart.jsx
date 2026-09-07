import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '../lib/format'

function niceStep(roughStep) {
  const exponent = Math.floor(Math.log10(roughStep))
  const fraction = roughStep / 10 ** exponent
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return niceFraction * 10 ** exponent
}

function buildYAxisTicks(data) {
  const rawMax = Math.max(1, ...data.flatMap((d) => [d.sales || 0, d.purchase || 0]))
  const step = niceStep(rawMax / 5)
  return Array.from({ length: 6 }, (_, i) => i * step)
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function PurchaseSalesChart({ data, loading }) {
  const yTicks = loading || !data?.length ? undefined : buildYAxisTicks(data)

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-sm font-semibold tracking-wide text-slate-700">PURCHASE &amp; SALES REPORT</h2>

      <div className="mt-4 h-80">
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f4" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                domain={yTicks ? [0, yTicks[yTicks.length - 1]] : undefined}
                ticks={yTicks}
                tickFormatter={(value) => `${Math.round(value / 1000)}K`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 13, color: '#475569', paddingBottom: 16 }}
              />
              <Bar dataKey="sales" name="Sales" fill="#0d5b7c" radius={[6, 6, 0, 0]} maxBarSize={20} />
              <Bar dataKey="purchase" name="Purchase" fill="#1591c6" radius={[6, 6, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
