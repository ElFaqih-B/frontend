import React from 'react'
import { clampPct } from '../utils/format.js'
export default function StatCard({ label, value, suffix, hint, pct, tone }) {
  const color = tone === 'good' ? 'bg-green' : tone === 'warn' ? 'bg-yellow' : tone === 'danger' ? 'bg-red' : 'bg-accent'
  return (
    <div className="panel-pad">
      <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-faint">
        <span className="truncate">{label}</span>
        {tone ? <span className={`h-1.5 w-1.5 rounded-full ${color}`} /> : null}
      </div>
      <div className="flex items-baseline gap-1 font-mono text-[21px] font-semibold tracking-[-0.02em] text-textc">
        <span>{value}</span>{suffix ? <small className="text-xs font-normal text-faint">{suffix}</small> : null}
      </div>
      {pct !== undefined ? <div className="mt-2 h-1 overflow-hidden rounded bg-borderc"><span className={`block h-full rounded ${color}`} style={{ width: `${clampPct(pct)}%` }} /></div> : null}
      {hint ? <div className="mt-1 text-xs text-faint">{hint}</div> : null}
    </div>
  )
}
