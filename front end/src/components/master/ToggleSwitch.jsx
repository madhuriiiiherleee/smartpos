export default function ToggleSwitch({ checked, onChange, disabled, label, activeColor = 'emerald' }) {
  const trackOn = activeColor === 'brand' ? 'bg-brand-500 ring-brand-600/20' : 'bg-emerald-500 ring-emerald-600/20'
  const textOn = activeColor === 'brand' ? 'text-brand-600' : 'text-emerald-600'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full ring-1 transition-colors ${
          checked ? trackOn : 'bg-slate-200 ring-slate-300'
        }`}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(4px)' }}
        />
      </span>
      <span className={`text-xs font-medium ${checked ? textOn : 'text-slate-400'}`}>
        {label ?? (checked ? 'Active' : 'Inactive')}
      </span>
    </button>
  )
}
