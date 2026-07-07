import React from "react"
export default function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null

  return (
    <div className="modal-backdrop-x" onMouseDown={onClose}>
      <div className={`modal-panel-x ${size}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom" style={{ borderColor: 'var(--border)' }}>
          <h6 className="m-0 fw-semibold">{title}</h6>
          <button className="btn btn-sm btn-outline-secondary border-0" onClick={onClose}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
