const THEMES = {
  pink: { icon: 'bg-pink-500' },
  amber: { icon: 'bg-amber-500' },
  emerald: { icon: 'bg-emerald-500' },
  violet: { icon: 'bg-violet-500' },
}

export default function SummaryCard({ label, value, icon: Icon, color = 'pink', loading }) {
  const theme = THEMES[color]

  return (
    <div className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.icon} text-white shadow-sm`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {loading ? (
          <div className="mt-2 h-6 w-24 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="mt-1 text-xl font-semibold text-slate-800">{value}</p>
        )}
      </div>
    </div>
  )
}
