export function FieldLabel({ children, required }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  )
}

const inputClasses =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

export function TextInput(props) {
  return <input {...props} className={`${inputClasses} ${props.className || ''}`} />
}

export function TextArea(props) {
  return <textarea {...props} className={`${inputClasses} resize-none ${props.className || ''}`} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputClasses} bg-white ${props.className || ''}`}>
      {children}
    </select>
  )
}

export function FormRow({ children, cols = 1 }) {
  const colsClass = cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : ''
  return <div className={`grid grid-cols-1 gap-4 ${colsClass}`}>{children}</div>
}

export function ViewCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {title && (
        <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="p-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {children}
        </dl>
      </div>
    </div>
  )
}

export function ViewField({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm">
      <dt className="font-medium text-slate-500 min-w-[140px] shrink-0 pt-0.5">{label}:</dt>
      <dd className="font-bold text-slate-900 break-words">{value || '—'}</dd>
    </div>
  )
}

