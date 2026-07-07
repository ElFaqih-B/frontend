import React from "react"
import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setItems((old) => [...old, { id, message: String(message || ''), type }])
    setTimeout(() => {
      setItems((old) => old.filter((x) => x.id !== id))
    }, 4200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toast-c">
        {items.map((x) => (
          <div key={x.id} className={`toastx toastx-${x.type}`}>
            <span className="fw-medium">{x.message}</span>
            <button
              className="btn btn-sm border-0 text-white"
              onClick={() => setItems((old) => old.filter((i) => i.id !== x.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
