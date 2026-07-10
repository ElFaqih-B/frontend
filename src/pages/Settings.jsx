import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getJson, postForm, postJson } from '../api.js'
import AccentPicker from '../components/AccentPicker.jsx'
import Icon from '../components/Icons.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const FALLBACK_KEYS = ['motd', 'server-port', 'max-players', 'difficulty', 'gamemode', 'online-mode', 'allow-flight', 'enable-rcon', 'rcon.port', 'view-distance', 'simulation-distance', 'spawn-protection']

function normalizeProps(data) {
  if (!data) return []
  if (Array.isArray(data.properties)) return data.properties.map((item) => typeof item === 'string' ? { key: item, value: '' } : item)
  const obj = data.properties || data
  return Object.entries(obj).filter(([, value]) => typeof value !== 'object').map(([key, value]) => ({ key, value }))
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-panel border px-3 py-2 text-sm font-semibold transition ${active ? 'border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-dim2)] text-[var(--accent-text)]' : 'border-borderc bg-panel text-dim hover:bg-hover hover:text-textc'}`}
    >
      {children}
    </button>
  )
}

export default function Settings() {
  const toast = useToast()
  const fileRef = useRef(null)

  const [tab, setTab] = useState('server')
  const [props, setProps] = useState([])
  const [branding, setBranding] = useState({ server_name: '', motd: '', icon_url: '' })
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      let propData = null
      try { propData = await getJson('/api/settings/properties') } catch { propData = await getJson('/api/settings') }
      const rows = normalizeProps(propData)
      setProps(rows.length ? rows : FALLBACK_KEYS.map((key) => ({ key, value: '' })))
      try { setBranding(await getJson('/api/settings/branding')) } catch {}
    } catch (e) {
      toast(e.message || 'Gagal memuat settings.', 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const filteredProps = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return props
    return props.filter((item) => [item.key, item.value].join(' ').toLowerCase().includes(q))
  }, [props, query])

  function updateProp(key, value) {
    setProps((rows) => rows.map((row) => row.key === key ? { ...row, value } : row))
  }

  async function saveProperties() {
    setBusy(true)
    const payload = Object.fromEntries(props.map((item) => [item.key, item.value]))
    try {
      let data
      try { data = await postJson('/api/settings/properties', { properties: payload }) } catch { data = await postJson('/api/settings/save', payload) }
      toast(data.message || 'Server properties disimpan.', data.success === false ? 'danger' : 'success')
    } catch (e) {
      toast(e.message || 'Gagal menyimpan server properties.', 'danger')
    } finally {
      setBusy(false)
    }
  }

  async function saveBranding(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const form = new FormData(e.currentTarget)
      const file = fileRef.current?.files?.[0]
      if (file) form.append('icon', file)
      const data = await postForm('/api/settings/branding', form)
      toast(data.message || 'Appearance disimpan.', data.success === false ? 'danger' : 'success')
      try { setBranding(await getJson('/api/settings/branding')) } catch {}
    } catch (err) {
      toast(err.message || 'Gagal menyimpan appearance.', 'danger')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Settings" title="Pengaturan" desc="Server settings dan appearance dipisah supaya lebih ringkas." actions={<button className="btn" onClick={load}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button>} />

      <nav className="flex flex-wrap gap-2">
        <TabButton active={tab === 'server'} onClick={() => setTab('server')}>Server settings</TabButton>
        <TabButton active={tab === 'appearance'} onClick={() => setTab('appearance')}>Appearance</TabButton>
      </nav>

      {tab === 'server' ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">server.properties</h3>
              <p className="panel-subtitle">Edit konfigurasi server Paper dari dashboard.</p>
            </div>
            <button className="btn btn-sm btn-accent" disabled={busy} onClick={saveProperties}><Icon name="save" className="h-3.5 w-3.5" />Simpan</button>
          </div>

          <div className="border-b border-soft p-3">
            <SearchBar value={query} onChange={setQuery} placeholder="Cari property, contoh: difficulty, motd, rcon..." />
          </div>

          <div className="divide-y divide-soft">
            {filteredProps.map((item) => (
              <div key={item.key} className="grid grid-cols-1 gap-2 px-3.5 py-3 md:grid-cols-[230px_1fr] md:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-textc">{item.key}</div>
                  <div className="truncate font-mono text-[11px] text-faint" title={String(item.value ?? '')}>current: {String(item.value ?? '')}</div>
                </div>
                <input className="input font-mono" value={item.value ?? ''} onChange={(e) => updateProp(item.key, e.target.value)} />
              </div>
            ))}
            {!filteredProps.length ? <div className="p-6"><p className="text-center text-sm text-faint">Property tidak ditemukan.</p></div> : null}
          </div>
        </section>
      ) : null}

      {tab === 'appearance' ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[360px_1fr]">
          <section className="panel h-fit">
            <div className="panel-head">
              <div>
                <h3 className="panel-title">Web appearance</h3>
                <p className="panel-subtitle">Warna aksen dashboard.</p>
              </div>
            </div>
            <div className="p-3">
              <AccentPicker />
            </div>
          </section>

          <form onSubmit={saveBranding} className="panel">
            <div className="panel-head">
              <div>
                <h3 className="panel-title">Server profile</h3>
                <p className="panel-subtitle">Nama, MOTD, dan icon server.</p>
              </div>
              <button className="btn btn-sm btn-accent" disabled={busy}><Icon name="save" className="h-3.5 w-3.5" />Simpan</button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[180px_1fr]">
              <div className="rounded-panel border border-soft bg-raised p-3">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-panel border border-borderc bg-[#090909]">
                  {branding.icon_url ? <img src={branding.icon_url} alt="Server icon" className="h-full w-full object-cover [image-rendering:pixelated]" /> : <Icon name="box" className="h-10 w-10 text-faint" />}
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-dim">Server icon</span>
                  <input ref={fileRef} className="input text-xs" type="file" accept="image/png,image/jpeg,image/webp" />
                </label>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-dim">Server name</span>
                  <input className="input" name="server_name" placeholder="Atomic PooPerS" value={branding.server_name || ''} onChange={(e) => setBranding((old) => ({ ...old, server_name: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-dim">MOTD</span>
                  <textarea className="input min-h-32 font-mono text-xs leading-6" name="motd" value={branding.motd || ''} onChange={(e) => setBranding((old) => ({ ...old, motd: e.target.value }))} />
                </label>
                <div className="rounded-panel border border-soft bg-raised p-3">
                  <div className="text-xs font-semibold text-dim">Preview</div>
                  <div className="mt-2 rounded-panel border border-borderc bg-panel p-3">
                    <div className="truncate text-sm font-semibold text-textc">{branding.server_name || 'Atomic PooPerS'}</div>
                    <pre className="mt-1 whitespace-pre-wrap font-mono text-xs leading-5 text-dim">{branding.motd || 'MOTD server akan tampil di sini.'}</pre>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
