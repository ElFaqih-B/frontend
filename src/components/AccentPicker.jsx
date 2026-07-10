import React, { useEffect, useMemo, useState } from 'react'

const PRESETS = [
  ['#c96442', 'Clay'],
  ['#7fb069', 'Moss'],
  ['#6a9fb5', 'Blue'],
  ['#c97fd4', 'Iris'],
  ['#d7ba7d', 'Gold'],
  ['#e5484d', 'Red'],
]

const STORAGE_KEY = 'panel-accent'

function readAccent() {
  try {
    return localStorage.getItem(STORAGE_KEY) || PRESETS[0][0]
  } catch {
    return PRESETS[0][0]
  }
}

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color)
  try {
    localStorage.setItem(STORAGE_KEY, color)
  } catch {}
}

export default function AccentPicker({ compact = false }) {
  const [accent, setAccent] = useState(() => (
    typeof window === 'undefined' ? PRESETS[0][0] : readAccent()
  ))

  useEffect(() => {
    applyAccent(accent)
  }, [accent])

  const activeName = useMemo(() => {
    const hit = PRESETS.find(([color]) => color.toLowerCase() === accent.toLowerCase())
    return hit ? hit[1] : 'Custom'
  }, [accent])

  if (compact) {
    return (
      <div className="hidden items-center gap-1.5 rounded-panel border border-borderc bg-panel px-2 py-1.5 sm:flex" title={`Accent: ${activeName} ${accent}`}>
        <span className="font-mono text-[11px] text-dim">aksen</span>
        <div className="flex items-center gap-1">
          {PRESETS.slice(0, 4).map(([color, name]) => (
            <button
              key={color}
              type="button"
              className={`h-4 w-4 rounded-full border ${accent.toLowerCase() === color.toLowerCase() ? 'border-textc ring-1 ring-textc' : 'border-white/10'}`}
              style={{ background: color }}
              title={`${name} ${color}`}
              aria-label={`Set accent ${name}`}
              onClick={() => setAccent(color)}
            />
          ))}
        </div>
        <label className="grid h-5 w-5 cursor-pointer place-items-center overflow-hidden rounded-full border border-borderc" style={{ background: accent }} title="Custom color">
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-8 w-8 cursor-pointer opacity-0"
            aria-label="Custom accent color"
          />
        </label>
      </div>
    )
  }

  return (
    <section className="panel-pad">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-textc">Accent color</div>
          <div className="font-mono text-xs text-faint">{activeName} · {accent}</div>
        </div>

        <label className="grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-panel border border-borderc" style={{ background: accent }} title="Custom color">
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-12 w-12 cursor-pointer opacity-0"
            aria-label="Custom accent color"
          />
        </label>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {PRESETS.map(([color, name]) => (
          <button
            key={color}
            type="button"
            className={`h-7 rounded-panel border ${accent.toLowerCase() === color.toLowerCase() ? 'border-textc ring-2 ring-[var(--accent-dim)]' : 'border-white/10'}`}
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
