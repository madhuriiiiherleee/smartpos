export default function ToggleSwitch({ checked, onChange, disabled }) {
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
          checked ? 'bg-emerald-500 ring-emerald-600/20' : 'bg-slate-200 ring-slate-300'
        }`}
      >
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(18px)' : 'translateX(4px)' }}
        />
      </span>
      <span className={`text-xs font-medium ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
        {checked ? 'Active' : 'Inactive'}
      </span>
    </button>
  )
}
