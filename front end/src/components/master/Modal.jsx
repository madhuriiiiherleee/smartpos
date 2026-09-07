import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, wide, size }) {
  const maxWidth = size === 'xl' ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-md'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4">
      <div className={`flex max-h-[90vh] w-full flex-col rounded-2xl border border-slate-200 bg-white shadow-xl ${maxWidth}`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
