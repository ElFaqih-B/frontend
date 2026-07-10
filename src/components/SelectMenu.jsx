import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icons.jsx'

export default function SelectMenu({ value, onChange, options = [], className = '', buttonClassName = '', align = 'left', label = '' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = useMemo(() => {
    return options.find((item) => item.value === value) || options[0] || { value: '', label: '--' }
  }, [options, value])

  useEffect(() => {
    function onDown(e) {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }

    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function choose(nextValue) {
    onChange?.(nextValue)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        className={`flex h-[38px] w-full min-w-0 items-center justify-between gap-2 rounded-panel border border-borderc bg-panel px-3 text-left text-[12.5px] text-textc outline-none transition hover:border-faint hover:bg-hover focus:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] focus:ring-2 focus:ring-[var(--accent-dim2)] ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">
          {label ? <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.06em] text-faint">{label}</span> : null}
          {selected.label}
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 shrink-0 text-faint transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className={`absolute z-[1200] mt-1 w-full min-w-[150px] overflow-hidden rounded-panel border border-borderc bg-raised shadow-[0_16px_50px_rgba(0,0,0,.45)] ${align === 'right' ? 'right-0' : 'left-0'}`} role="listbox">
          <div className="max-h-64 overflow-auto p-1">
            {options.map((item) => {
              const active = item.value === value

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 rounded-[4px] px-2.5 py-2 text-left text-[12.5px] transition ${active ? 'bg-[var(--accent-dim2)] text-[var(--accent-text)]' : 'text-dim hover:bg-hover hover:text-textc'}`}
                  onClick={() => choose(item.value)}
                  role="option"
                  aria-selected={active}
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  {active ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
