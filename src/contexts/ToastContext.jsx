import React from 'react'
import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})
export function useToast() { return useContext(ToastContext) }

function toneClass(type) {
  if (type === 'danger' || type === 'error') return 'border-red text-red'
  if (type === 'warning' || type === 'warn') return 'border-yellow text-yellow'
  return 'border-green text-green'
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setItems((old) => [...old, { id, message: String(message || ''), type }])
    setTimeout(() => setItems((old) => old.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[2000] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((x) => (
          <div key={x.id} className={`flex items-center justify-between gap-3 rounded-panel border bg-raised px-3 py-2 text-sm shadow-xl ${toneClass(x.type)}`}>
            <span className="min-w-0 break-words text-textc">{x.message}</span>
            <button className="rounded px-2 text-lg leading-none text-faint hover:text-textc" onClick={() => setItems((old) => old.filter((i) => i.id !== x.id))}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
