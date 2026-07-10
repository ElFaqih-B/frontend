import React from 'react'
import Icon from './Icons.jsx'
export default function Modal({ title, children, footer, onClose, size = 'md' }) {
  const width = size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-lg'
  return (
    <div className="fixed inset-0 z-[1800] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section className={`panel w-full ${width}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h3 className="panel-title">{title}</h3>
          <button className="btn btn-icon" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="p-3 sm:p-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-soft p-3 sm:p-4">{footer}</div> : null}
      </section>
    </div>
  )
}
