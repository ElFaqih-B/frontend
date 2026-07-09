import React from 'react'

export default function PageHeader({ eyebrow, title, description, actions = null }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-desc">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  )
}
