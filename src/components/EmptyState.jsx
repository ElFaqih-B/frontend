import React from 'react'

export default function EmptyState({ title = 'Tidak ada data', description = '' }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {description ? <div className="empty-desc">{description}</div> : null}
    </div>
  )
}
