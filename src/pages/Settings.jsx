import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const IMPORTANT_KEYS = [
  'motd',
  'max-players',
  'server-port',
  'online-mode',
  'white-list',
  'difficulty',
  'gamemode',
  'pvp',
  'view-distance',
  'simulation-distance',
  'spawn-protection',
  'enable-rcon',
  'rcon.port',
]

const COLOR_CODES = [
  ['§0', 'Black', '#000000'],
  ['§1', 'Dark Blue', '#0000AA'],
  ['§2', 'Dark Green', '#00AA00'],
  ['§3', 'Dark Aqua', '#00AAAA'],
  ['§4', 'Dark Red', '#AA0000'],
  ['§5', 'Dark Purple', '#AA00AA'],
  ['§6', 'Gold', '#FFAA00'],
  ['§7', 'Gray', '#AAAAAA'],
  ['§8', 'Dark Gray', '#555555'],
  ['§9', 'Blue', '#5555FF'],
  ['§a', 'Green', '#55FF55'],
  ['§b', 'Aqua', '#55FFFF'],
  ['§c', 'Red', '#FF5555'],
  ['§d', 'Pink', '#FF55FF'],
  ['§e', 'Yellow', '#FFFF55'],
  ['§f', 'White', '#FFFFFF'],
]

const FORMAT_CODES = [
  ['§l', 'Bold'],
  ['§o', 'Italic'],
  ['§n', 'Underline'],
  ['§m', 'Strike'],
  ['§r', 'Reset'],
]

const COLOR_MAP = Object.fromEntries(COLOR_CODES.map(([code, , color]) => [code, color]))

function labelForKey(key) {
  const labels = {
    motd: 'Message of the Day',
    'max-players': 'Max Players',
    'server-port': 'Server Port',
    'online-mode': 'Online Mode',
    'white-list': 'Whitelist',
    difficulty: 'Difficulty',
    gamemode: 'Default Gamemode',
    pvp: 'PvP',
    'view-distance': 'View Distance',
    'simulation-distance': 'Simulation Distance',
    'spawn-protection': 'Spawn Protection',
    'enable-rcon': 'Enable RCON',
    'rcon.port': 'RCON Port',
  }

  return labels[key] || key
}

function selectOptions(key) {
  const map = {
    difficulty: ['peaceful', 'easy', 'normal', 'hard'],
    gamemode: ['survival', 'creative', 'adventure', 'spectator'],
    pvp: ['true', 'false'],
    'online-mode': ['true', 'false'],
    'white-list': ['true', 'false'],
    'enable-rcon': ['true', 'false'],
  }
  return map[key] || null
}

function renderMotd(text) {
  const lines = String(text || '').split('\n')
  let style = { color: '#e5e7eb', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' }

  return lines.map((line, lineIndex) => {
    const parts = []
    let buffer = ''

    function flush(i) {
      if (!buffer) return
      parts.push(<span key={`${lineIndex}-${i}-${parts.length}`} style={style}>{buffer}</span>)
      buffer = ''
    }

    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === '§' && i + 1 < line.length) {
        flush(i)
        const code = `§${line[i + 1].toLowerCase()}`

        if (COLOR_MAP[code]) style = { ...style, color: COLOR_MAP[code] }
        if (code === '§l') style = { ...style, fontWeight: 700 }
        if (code === '§o') style = { ...style, fontStyle: 'italic' }
        if (code === '§n') style = { ...style, textDecoration: 'underline' }
        if (code === '§m') style = { ...style, textDecoration: 'line-through' }
        if (code === '§r') style = { color: '#e5e7eb', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' }

        i += 1
      } else {
        buffer += line[i]
      }
    }

    flush('end')
    return <div key={lineIndex}>{parts.length ? parts : <span>&nbsp;</span>}</div>
  })
}

function PropertyField({ name, value, onChange }) {
  const options = selectOptions(name)

  return (
    <div className="property-row">
      <div className="property-meta">
        <div className="property-title">{labelForKey(name)}</div>
        <div className="property-key font-monospace">{name}</div>
      </div>

      <div className="property-input-wrap">
        {options ? (
          <select className="form-select" value={value ?? ''} onChange={(e) => onChange(name, e.target.value)}>
            {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            className="form-control font-monospace"
            value={value ?? ''}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={`value untuk ${name}`}
            disabled={name === 'motd'}
          />
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const motdRef = useRef(null)
  const [props, setProps] = useState({})
  const [motd, setMotd] = useState('')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState('')
  const [serverDir, setServerDir] = useState('')
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('important')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let properties = {}
      let branding = null

      try {
        const data = await getJson('/api/settings/properties')
        properties = data.properties || {}
      } catch {
        const data = await getJson('/api/settings')
        properties = data.props || {}
      }

      try {
        branding = await getJson('/api/settings/branding')
      } catch {
        branding = null
      }

      setProps(properties)
      setMotd((branding?.motd || properties.motd || '').replace(/\\n/g, '\n'))
      setServerDir(branding?.server_dir || '')
      setIconPreview(branding?.icon_url ? apiUrl(branding.icon_url) : '')
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  function setVal(key, value) {
    setProps((old) => ({ ...old, [key]: value }))
  }

  function insertMotd(code) {
    const el = motdRef.current
    if (!el) {
      setMotd((old) => `${old}${code}`)
      return
    }

    const start = el.selectionStart
    const end = el.selectionEnd
    const next = `${motd.slice(0, start)}${code}${motd.slice(end)}`
    setMotd(next)

    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + code.length, start + code.length)
    })
  }

  function onPickIcon(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  async function saveProperties() {
    const payload = { ...props, motd: motd.replace(/\n/g, '\\n') }

    try {
      let data
      try {
        data = await postJson('/api/settings/properties', { properties: payload })
      } catch {
        data = await postJson('/api/settings/save', payload)
      }
      toast(data.message || 'server.properties berhasil disimpan.', data.success !== false ? 'success' : 'danger')
      await load()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  async function saveBranding() {
    try {
      const form = new FormData()
      form.append('motd', motd)
      if (iconFile) form.append('icon', iconFile)

      try {
        const data = await postForm('/api/settings/branding', form)
        toast(data.message || 'Branding berhasil disimpan.', data.success !== false ? 'success' : 'danger')
      } catch {
        await saveProperties()
        toast('MOTD disimpan. Endpoint upload icon tidak tersedia di backend ini.', 'warning')
      }

      setIconFile(null)
      await load()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  const propertyEntries = useMemo(() => {
    let entries = Object.entries(props)

    if (mode === 'important') {
      const set = new Set(IMPORTANT_KEYS)
      entries = entries.filter(([key]) => set.has(key))
    }

    const q = query.trim().toLowerCase()
    if (q) {
      entries = entries.filter(([key, value]) => `${key} ${labelForKey(key)} ${value}`.toLowerCase().includes(q))
    }

    entries.sort(([a], [b]) => {
      const ai = IMPORTANT_KEYS.indexOf(a)
      const bi = IMPORTANT_KEYS.indexOf(b)
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      return a.localeCompare(b)
    })

    return entries
  }, [props, query, mode])

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Server settings"
        description="Branding dan konfigurasi server.properties dari panel web."
        actions={(
          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-soft" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
            <button className="btn btn-primary" onClick={saveProperties}>Save properties</button>
          </div>
        )}
      />

      <div className="row g-4">
        <div className="col-xl-5">
          <div className="panel-card h-100">
            <div className="panel-head">
              <div>
                <h3>Branding</h3>
                <p>Server icon dan MOTD untuk server list Minecraft.</p>
              </div>
            </div>

            <div className="branding-preview mb-4">
              <div className="server-icon-preview">
                {iconPreview ? <img src={iconPreview} alt="server-icon" /> : <span>64</span>}
              </div>
              <div className="min-w-0">
                <div className="fw-semibold text-light mb-1">Atomic PooPerS</div>
                <div className="motd-preview font-monospace">
                  {renderMotd(motd || '§7A Minecraft Server')}
                </div>
              </div>
            </div>

            <label className="form-label text-muted small fw-medium">Server icon</label>
            <input className="form-control mb-3" type="file" accept="image/png,image/jpeg,image/webp" onChange={onPickIcon} />

            <label className="form-label text-muted small fw-medium">MOTD</label>
            <textarea
              ref={motdRef}
              className="form-control font-monospace mb-3"
              rows="4"
              value={motd}
              onChange={(e) => setMotd(e.target.value)}
              placeholder="§b§lAtomic PooPerS §8» §fSurvival Private"
            />

            <div className="color-grid mb-3">
              {COLOR_CODES.map(([code, label, color]) => (
                <button key={code} type="button" className="btn btn-sm btn-soft" onClick={() => insertMotd(code)} title={label}>
                  <span style={{ color }}>■</span> {code}
                </button>
              ))}
            </div>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {FORMAT_CODES.map(([code, label]) => (
                <button key={code} type="button" className="btn btn-sm btn-soft" onClick={() => insertMotd(code)}>
                  {label} <span className="font-monospace">{code}</span>
                </button>
              ))}
            </div>

            <button className="btn btn-primary w-100" onClick={saveBranding}>Save branding</button>

            <div className="helper-note mt-3">
              Restart server Minecraft diperlukan agar icon/MOTD terlihat di client.
              {serverDir ? <div className="font-monospace mt-2">{serverDir}</div> : null}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="panel-card h-100">
            <div className="panel-head align-items-start">
              <div>
                <h3>server.properties</h3>
                <p>Search khusus key/value konfigurasi server.</p>
              </div>
              <div className="segmented">
                <button className={mode === 'important' ? 'active' : ''} onClick={() => setMode('important')}>Important</button>
                <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>All</button>
              </div>
            </div>

            <div className="table-toolbar px-0 pt-0">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Cari: rcon, whitelist, distance, pvp..."
                className="flex-grow-1"
              />
            </div>

            <div className="settings-list">
              {propertyEntries.length ? (
                propertyEntries.map(([key, value]) => (
                  <PropertyField key={key} name={key} value={key === 'motd' ? motd : value} onChange={setVal} />
                ))
              ) : (
                <EmptyState title="Tidak ada property cocok" description="Ubah kata kunci atau pindah mode ke All." />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
