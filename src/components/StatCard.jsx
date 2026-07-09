import React from 'react'

export default function StatCard({
  label,
  value,
  suffix = '',
  hint = '',
  tone = 'neutral',
  progress = null,
}) {
  const pct = progress === null || progress === undefined || Number.isNaN(Number(progress))
    ? null
    : Math.max(0, Math.min(100, Number(progress)))

  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value-row">
        <span className="stat-value">{value}</span>
        {suffix ? <span className="stat-suffix">{suffix}</span> : null}
      </div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
      {pct !== null ? (
        <div className="meter">
          <span style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  )
}
