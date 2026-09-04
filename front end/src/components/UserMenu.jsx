import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, UserCog } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function goTo(path) {
    setOpen(false)
    navigate(path)
  }

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const username = user?.username || ''
  const initial = username.charAt(0).toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${open ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-brand-600 to-brand-500 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-sm font-medium capitalize text-slate-700 sm:block">{username}</span>
        <ChevronDown size={15} className={`hidden text-slate-400 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => goTo('/profile-settings')}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UserCog size={15} className="text-slate-400" />
            Profile
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
