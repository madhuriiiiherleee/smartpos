import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function SearchableSelect({ value, onChange, options, placeholder = 'Select...', disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value)) || null

  function close() {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  function handleSelect(option) {
    onChange(String(option.value))
    close()
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : selected?.label || ''}
          placeholder={selected ? '' : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true)
            setQuery(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close()
              inputRef.current?.blur()
            } else if (e.key === 'Enter' && filtered.length === 1) {
              e.preventDefault()
              handleSelect(filtered[0])
            }
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        />
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">No matches found.</p>}
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                String(option.value) === String(value) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
