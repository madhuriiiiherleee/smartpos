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
