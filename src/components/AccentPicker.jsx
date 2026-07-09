import React, { useEffect, useMemo, useState } from 'react'

const PRESETS = [
  ['#536b86', 'Slate'],
  ['#607b9a', 'Steel'],
  ['#577b5e', 'Moss'],
  ['#8b6f4e', 'Tawny'],
  ['#7a678f', 'Iris'],
  ['#9a5f5f', 'Clay'],
]

const STORAGE_KEY = 'panel-accent'

function readAccent() {
  try {
    return localStorage.getItem(STORAGE_KEY) || PRESETS[0][0]
  } catch {
    return PRESETS[0][0]
  }
}


function clamp(n, min = 0, max = 255) {
  return Math.max(min, Math.min(max, n))
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim()
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return { r: 83, g: 107, b: 134 }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, '0')).join('')}`
}

function mixWithWhite(rgb, amount = 0.11) {
  return {
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  }
}

function applyAccent(color) {
  const rgb = hexToRgb(color)
  const hover = rgbToHex(mixWithWhite(rgb, 0.11))

  document.documentElement.style.setProperty('--accent', color)
  document.documentElement.style.setProperty('--accent-hover', hover)
  document.documentElement.style.setProperty('--accent-alpha', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`)
  document.documentElement.style.setProperty('--accent-alpha-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)

  try {
    localStorage.setItem(STORAGE_KEY, color)
  } catch {}
}


export default function AccentPicker({ placement = 'inline' }) {
  const [accent, setAccent] = useState(() => (typeof window === 'undefined' ? PRESETS[0][0] : readAccent()))

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  const activeName = useMemo(() => {
    const hit = PRESETS.find(([color]) => color.toLowerCase() === accent.toLowerCase())
    return hit ? hit[1] : 'Custom'
  }, [accent])

  return (
    <section className={`accent-picker accent-picker-${placement}`} aria-label="Accent color">
      <div className="accent-picker-head">
        <div>
          <div className="accent-picker-label">Accent</div>
          <div className="accent-picker-current">{activeName} · {accent}</div>
        </div>
        <label className="color-input-wrap" aria-label="Custom accent color" title="Custom color">
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </label>
      </div>

      <div className="swatches">
        {PRESETS.map(([color, name]) => (
          <button
            key={color}
            type="button"
            className={`swatch ${accent.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
            style={{ background: color }}
            title={`${name} ${color}`}
            aria-label={`Set accent ${name}`}
            onClick={() => setAccent(color)}
          />
        ))}
      </div>
    </section>
  )
}
