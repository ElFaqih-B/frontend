import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'

const COLOR_CODES = [
  ['§0', 'Black'],
  ['§1', 'Dark Blue'],
  ['§2', 'Dark Green'],
  ['§3', 'Dark Aqua'],
  ['§4', 'Dark Red'],
  ['§5', 'Dark Purple'],
  ['§6', 'Gold'],
  ['§7', 'Gray'],
  ['§8', 'Dark Gray'],
  ['§9', 'Blue'],
  ['§a', 'Green'],
  ['§b', 'Aqua'],
  ['§c', 'Red'],
  ['§d', 'Pink'],
  ['§e', 'Yellow'],
  ['§f', 'White'],
]

const FORMAT_CODES = [
  ['§l', 'Bold'],
  ['§o', 'Italic'],
  ['§n', 'Underline'],
  ['§m', 'Strike'],
  ['§r', 'Reset'],
]

const IMPORTANT_KEYS = [
  'motd',
  'max-players',
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

const COLOR_CLASS = {
  '§0': '#000000',
  '§1': '#0000AA',
  '§2': '#00AA00',
  '§3': '#00AAAA',
  '§4': '#AA0000',
  '§5': '#AA00AA',
  '§6': '#FFAA00',
  '§7': '#AAAAAA',
  '§8': '#555555',
  '§9': '#5555FF',
  '§a': '#55FF55',
  '§b': '#55FFFF',
  '§c': '#FF5555',
  '§d': '#FF55FF',
  '§e': '#FFFF55',
  '§f': '#FFFFFF',
}

function renderMotd(text) {
  const lines = String(text || '').split('\n')
  let currentStyle = { color: '#FFFFFF' }
  let bold = false
  let italic = false
  let underline = false
  let strike = false

  function styleObj() {
    return {
      color: currentStyle.color,
      fontWeight: bold ? 700 : 400,
      fontStyle: italic ? 'italic' : 'normal',
      textDecoration: [
        underline ? 'underline' : '',
        strike ? 'line-through' : '',
      ].filter(Boolean).join(' '),
    }
  }

  return lines.map((line, lineIndex) => {
    const parts = []
    let buffer = ''

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]

      if (ch === '§' && i + 1 < line.length) {
        if (buffer) {
          parts.push(
            <span key={`${lineIndex}-${i}-${parts.length}`} style={styleObj()}>
              {buffer}
            </span>
          )
          buffer = ''
        }

        const code = `§${line[i + 1].toLowerCase()}`

        if (COLOR_CLASS[code]) {
          currentStyle = { color: COLOR_CLASS[code] }
        } else if (code === '§l') {
          bold = true
        } else if (code === '§o') {
          italic = true
        } else if (code === '§n') {
          underline = true
        } else if (code === '§m') {
          strike = true
        } else if (code === '§r') {
          currentStyle = { color: '#FFFFFF' }
          bold = false
          italic = false
          underline = false
          strike = false
        }

        i += 1
      } else {
        buffer += ch
      }
    }

    if (buffer) {
      parts.push(
        <span key={`${lineIndex}-end`} style={styleObj()}>
          {buffer}
        </span>
      )
    }

    return (
      <div key={lineIndex}>
        {parts.length ? parts : <span>&nbsp;</span>}
      </div>
    )
  })
}

export default function Settings() {
  const toast = useToast()
  const motdRef = useRef(null)

  const [properties, setProperties] = useState({})
  const [motd, setMotd] = useState('')
  const [iconFile, setIconFile] = useState(null)
  const [iconPreview, setIconPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [serverDir, setServerDir] = useState('')

  const loadSettings = useCallback(async () => {
    setLoading(true)

    try {
      const [propsData, brandingData] = await Promise.all([
        getJson('/api/settings/properties'),
        getJson('/api/settings/branding'),
      ])

      setProperties(propsData.properties || {})
      setMotd(brandingData.motd || '')
      setServerDir(brandingData.server_dir || '')

      if (brandingData.icon_url) {
        setIconPreview(apiUrl(brandingData.icon_url))
      } else {
        setIconPreview('')
      }
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  function insertMotdCode(code) {
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

  function updateProp(key, value) {
    setProperties((old) => ({
      ...old,
      [key]: value,
    }))

    if (key === 'motd') {
      setMotd(value.replace(/\\n/g, '\n'))
    }
  }

  async function saveProperties() {
    try {
      const payload = {
        ...properties,
        motd: motd.replace(/\n/g, '\\n'),
      }

      const data = await postJson('/api/settings/properties', {
        properties: payload,
      })

      toast(data.message || 'Settings berhasil disimpan.', data.success ? 'success' : 'danger')
      await loadSettings()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  async function saveBranding() {
    try {
      const form = new FormData()
      form.append('motd', motd)

      if (iconFile) {
        form.append('icon', iconFile)
      }

      const data = await postForm('/api/settings/branding', form)

      toast(data.message || 'Branding berhasil disimpan.', data.success ? 'success' : 'danger')
      setIconFile(null)
      await loadSettings()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  function onPickIcon(e) {
    const file = e.target.files?.[0]

    if (!file) return

    setIconFile(file)
    setIconPreview(URL.createObjectURL(file))
  }

  return (
    <div className="row g-4">
      <div className="col-lg-7">
        <div className="card h-100">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-palette me-2 text-muted" />
              Server Branding
            </span>

            <button className="btn btn-sm btn-outline-secondary" onClick={loadSettings} disabled={loading}>
              <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} />
            </button>
          </div>

          <div className="card-body">
            <div className="mb-4">
              <label className="form-label text-muted small fw-medium">Server Icon</label>

              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div
                  className="border rounded d-flex align-items-center justify-content-center"
                  style={{
                    width: 76,
                    height: 76,
                    borderColor: 'var(--border)',
                    background: 'rgba(255,255,255,.03)',
                  }}
                >
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt="server-icon"
                      width="64"
                      height="64"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <i className="bi bi-image text-muted fs-2" />
                  )}
                </div>

                <div className="flex-grow-1">
                  <input
                    className="form-control"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onPickIcon}
                  />

                  <div className="form-text text-muted">
                    Upload gambar apa saja, backend otomatis resize ke <code>server-icon.png</code> 64x64.
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small fw-medium">MOTD / Server List Text</label>

              <textarea
                ref={motdRef}
                className="form-control font-monospace"
                rows="4"
                value={motd}
                onChange={(e) => setMotd(e.target.value)}
                placeholder="§b§lFAQIH SMP §8» §fSurvival Private&#10;§7No Grief • Skills • Furniture"
              />
            </div>

            <div className="mb-3">
              <div className="text-muted small fw-medium mb-2">Color</div>

              <div className="d-flex flex-wrap gap-2">
                {COLOR_CODES.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => insertMotdCode(code)}
                    title={label}
                  >
                    <span style={{ color: COLOR_CLASS[code] }}>■</span> {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-muted small fw-medium mb-2">Format</div>

              <div className="d-flex flex-wrap gap-2">
                {FORMAT_CODES.map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => insertMotdCode(code)}
                  >
                    {label} <span className="font-monospace">{code}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={saveBranding}>
              <i className="bi bi-save me-1" />
              Simpan Branding
            </button>

            <div className="alert alert-warning mt-3 mb-0 small">
              Setelah simpan icon/MOTD, restart server Minecraft agar server list client berubah.
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card mb-4">
          <div className="card-header">
            <i className="bi bi-eye me-2 text-muted" />
            Preview Server List
          </div>

          <div className="card-body">
            <div
              className="border rounded p-3"
              style={{
                borderColor: 'var(--border)',
                background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
              }}
            >
              <div className="d-flex gap-3 align-items-center">
                <div
                  className="border rounded d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 72,
                    height: 72,
                    borderColor: 'var(--border)',
                    background: 'rgba(0,0,0,.25)',
                  }}
                >
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt="preview"
                      width="64"
                      height="64"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  ) : (
                    <i className="bi bi-image text-muted fs-2" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-light fw-semibold mb-1">Minecraft Server</div>

                  <div className="font-monospace small" style={{ lineHeight: 1.35 }}>
                    {renderMotd(motd || '§7A Minecraft Server')}
                  </div>

                  <div className="text-muted small mt-2">
                    {serverDir || 'Server directory belum terbaca'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 small text-muted">
              Preview ini simulasi web. Tampilan final di Minecraft client bisa sedikit berbeda.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <i className="bi bi-sliders me-2 text-muted" />
            Quick Server Properties
          </div>

          <div className="card-body">
            <div className="d-flex flex-column gap-3">
              {IMPORTANT_KEYS.map((key) => (
                <div key={key}>
                  <label className="form-label text-muted small fw-medium">{key}</label>

                  <input
                    className="form-control font-monospace"
                    value={properties[key] ?? ''}
                    onChange={(e) => updateProp(key, e.target.value)}
                    placeholder={`value untuk ${key}`}
                    disabled={key === 'motd'}
                  />

                  {key === 'motd' ? (
                    <div className="form-text text-muted">
                      MOTD diatur dari panel Server Branding di kiri.
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <button className="btn btn-outline-primary mt-4" onClick={saveProperties}>
              <i className="bi bi-save me-1" />
              Simpan Properties
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}