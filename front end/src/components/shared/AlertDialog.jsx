import { useEffect, useRef } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'

const AUTO_CLOSE_MS = 2000

export default function AlertDialog({ open, variant = 'success', title, message, onClose, onCloseNav }) {
  const onCloseRef = useRef(onClose)
  const onCloseNavRef = useRef(onCloseNav)
  useEffect(() => {
    onCloseRef.current = onClose
    onCloseNavRef.current = onCloseNav
  }, [onClose, onCloseNav])

  useEffect(() => {
    if (!open || variant !== 'success') return
    const timer = setTimeout(() => {
      if (typeof onCloseRef.current === 'function') onCloseRef.current()
      if (onCloseNavRef.current) onCloseNavRef.current()
    }, AUTO_CLOSE_MS)
    return () => clearTimeout(timer)
  }, [open, variant])

  if (!open) return null
  const isSuccess = variant === 'success'

  function handleClose() {
    if (typeof onClose === 'function') onClose()
    if (onCloseNav) onCloseNav()
  }
  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4 backdrop-blur-sm">
      <div className="dialog-card w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
            isSuccess ? 'bg-emerald-50' : 'bg-rose-50'
          }`}
        >
          {isSuccess ? (
            <CircleCheck className="h-6 w-6 text-emerald-500" />
          ) : (
            <TriangleAlert className="h-6 w-6 text-rose-500" />
          )}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleClose}
            className={`rounded-lg px-6 py-2 text-sm font-medium text-white transition ${
              isSuccess ? 'bg-brand-600 hover:bg-brand-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
