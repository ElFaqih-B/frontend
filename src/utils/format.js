export function num(value, fallback = '--', digits = 1) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return fallback
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

export function percent(value, fallback = '--') {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return fallback
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

export function clampPct(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export function dash(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

export function formatBytesText(text) {
  return text || '--'
}
