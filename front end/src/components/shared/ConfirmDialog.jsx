import { CircleAlert, TriangleAlert } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
  busy = false,
}) {
  if (!open) return null

  const isDanger = confirmLabel.toLowerCase().includes('delete')

  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4">
      <div className="dialog-card w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            isDanger ? 'bg-rose-50' : 'bg-brand-50'
          }`}
        >
          {isDanger ? (
            <TriangleAlert className="h-6 w-6 text-rose-500" />
          ) : (
            <CircleAlert className="h-6 w-6 text-brand-600" />
          )}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
