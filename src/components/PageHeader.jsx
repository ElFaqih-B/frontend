import React from 'react'
export default function PageHeader({ eyebrow, title, desc, actions }) {
  return (
    <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint">{eyebrow}</div> : null}
        <h1 className="m-0 truncate text-xl font-semibold tracking-[-0.02em] text-textc sm:text-[22px]">{title}</h1>
        {desc ? <p className="mt-1 max-w-2xl text-sm text-dim">{desc}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
