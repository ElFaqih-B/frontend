import React from "react"
export function LabeledInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <div className="mb-3">
      <label className="form-label small text-muted fw-medium">{label}</label>
      <input
        type={type}
        className="form-control"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function SettingInput({ label, name, value, onChange, type = 'text', col = 'col-md-3', mono = false }) {
  return (
    <div className={col}>
      <label className={`form-label small text-muted fw-medium ${mono ? 'font-monospace' : ''}`}>{label}</label>
      <input
        type={type}
        className={`form-control ${mono ? 'font-monospace' : ''}`}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  )
}

export function SettingSelect({ label, name, value, onChange, options, labels }) {
  return (
    <div className="col-md-3">
      <label className="form-label small text-muted fw-medium">{label}</label>
      <select className="form-select" value={value} onChange={(e) => onChange(name, e.target.value)}>
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels?.[i] || o}
          </option>
        ))}
      </select>
    </div>
  )
}
