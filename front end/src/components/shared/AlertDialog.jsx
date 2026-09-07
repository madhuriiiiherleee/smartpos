import { useEffect, useRef, useState } from 'react'
import { CircleCheck, TriangleAlert } from 'lucide-react'

const AUTO_CLOSE_MS = 2500

export default function AlertDialog({ open, variant = 'success', title, message, onClose, onCloseNav }) {
  const onCloseRef = useRef(onClose)
  const onCloseNavRef = useRef(onCloseNav)
  const [drained, setDrained] = useState(false)

  useEffect(() => {
    onCloseRef.current = onClose
    onCloseNavRef.current = onCloseNav
  }, [onClose, onCloseNav])

  useEffect(() => {
    if (!open || variant !== 'success') return
    setDrained(false)
    const raf = requestAnimationFrame(() => setDrained(true))
    const timer = setTimeout(() => {
      if (typeof onCloseRef.current === 'function') onCloseRef.current()
      if (onCloseNavRef.current) onCloseNavRef.current()
    }, AUTO_CLOSE_MS)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [open, variant])

  if (!open) return null
  const isSuccess = variant === 'success'

  function handleClose() {
    if (typeof onClose === 'function') onClose()
    if (onCloseNav) onCloseNav()
  }
  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 px-4">
      <div className="dialog-card w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
            isSuccess ? 'bg-emerald-50' : 'bg-rose-50'
          }`}
        >
          {isSuccess ? (
            <CircleCheck className="h-11 w-11 text-emerald-500" strokeWidth={1.75} />
          ) : (
            <TriangleAlert className="h-11 w-11 text-rose-500" strokeWidth={1.75} />
          )}
        </div>
        <h3 className="mt-5 text-2xl font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-base text-slate-500">{message}</p>

        {isSuccess && (
          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{
                width: drained ? '0%' : '100%',
                transition: drained ? `width ${AUTO_CLOSE_MS}ms linear` : 'none',
              }}
            />
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleClose}
            className={`rounded-lg px-6 py-2.5 text-sm font-medium text-white transition ${
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
