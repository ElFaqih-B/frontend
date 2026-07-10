import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import Modal from '../components/Modal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

function pluginName(plugin) {
  return plugin?.name || plugin?.filename || 'Plugin'
}

function pluginFile(plugin) {
  return plugin?.filename || pluginName(plugin)
}

function statusClass(plugin) {
  return plugin?.enabled === false
    ? 'border-faint/40 text-faint'
    : 'border-green/40 bg-green/10 text-green'
}

function SmallIconButton({ title, children, danger = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-panel border border-borderc bg-panel text-xs transition hover:bg-hover disabled:opacity-50 ${danger ? 'text-red hover:border-red/50' : 'text-dim hover:text-textc'}`}
    >
      {children}
    </button>
  )
}

export default function Plugins() {
  const toast = useToast()
  const fileRef = useRef(null)

  const [plugins, setPlugins] = useState([])
  const [meta, setMeta] = useState({ dir: 'plugins', loader: 'paper' })
  const [query, setQuery] = useState('')
  const [cfg, setCfg] = useState(null)
  const [busy, setBusy] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getJson('/api/plugins')
      setPlugins(Array.isArray(data.plugins) ? data.plugins : [])
      setMeta({ dir: data.dir || 'plugins', loader: data.loader || 'paper' })
    } catch (e) {
      toast(e.message || 'Gagal memuat plugins.', 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plugins
    return plugins.filter((item) => [item.name, item.filename, item.version, item.author, item.description].join(' ').toLowerCase().includes(q))
  }, [plugins, query])

  async function reloadPlugin(name = '') {
    const key = `reload:${name || 'all'}`
    setBusy(key)
    try {
      const data = await postJson('/api/plugin/reload', { name })
      toast(data.message || 'Reload plugin dikirim.', data.success === false ? 'danger' : 'success')
      setTimeout(load, 800)
    } catch (e) {
      toast(e.message || 'Reload gagal.', 'danger')
    } finally {
      setBusy('')
    }
  }

  async function deletePlugin(filename) {
    if (!window.confirm(`Hapus ${filename}?`)) return
    const key = `delete:${filename}`
    setBusy(key)
    try {
      const data = await postJson('/api/plugin/delete', { filename })
      toast(data.message || 'Plugin dihapus.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) load()
    } catch (e) {
      toast(e.message || 'Delete gagal.', 'danger')
    } finally {
      setBusy('')
    }
  }

  async function openConfig(name) {
    try {
      const data = await getJson(`/api/plugin/config/${encodeURIComponent(name)}`)
      if (data.success === false) return toast(data.message || 'Config tidak ditemukan.', 'danger')
      setCfg({ name, content: data.content || '' })
    } catch (e) {
      toast(e.message || 'Config tidak ditemukan.', 'danger')
    }
  }

  async function saveConfig() {
    if (!cfg) return
    try {
      const data = await postJson(`/api/plugin/config/${encodeURIComponent(cfg.name)}`, { content: cfg.content })
      toast(data.message || 'Config tersimpan.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) setCfg(null)
    } catch (e) {
      toast(e.message || 'Gagal menyimpan config.', 'danger')
    }
  }

  async function uploadPlugin(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('file', file)

    try {
      const data = await postForm('/api/plugins/upload', fd)
      toast(data.message || 'Plugin diupload.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) load()
    } catch (err) {
      toast(err.message || 'Upload gagal.', 'danger')
    } finally {
      e.target.value = ''
    }
  }

  async function searchPlugin() {
    const q = search.trim()
    if (!q) return

    setSearching(true)
    try {
      const data = await getJson(`/api/plugin/search?q=${encodeURIComponent(q)}`)
      setResults(Array.isArray(data.results) ? data.results : [])
      if (data.success === false) toast(data.message || 'Pencarian gagal.', 'danger')
    } catch (e) {
      toast(e.message || 'Pencarian gagal.', 'danger')
    } finally {
      setSearching(false)
    }
  }

  async function installPlugin(projectId) {
    const key = `install:${projectId}`
    setBusy(key)
    try {
      const data = await postJson('/api/plugin/download', { project_id: projectId })
      toast(data.message || 'Install dikirim.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) load()
    } catch (e) {
      toast(e.message || 'Install gagal.', 'danger')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        eyebrow="Plugins"
        title="Plugin Manager"
        desc="Daftar plugin dibuat list agar lebih mudah dibaca. Aksi cepat memakai tombol icon kecil."
        actions={(
          <>
            <input ref={fileRef} type="file" accept=".jar" className="hidden" onChange={uploadPlugin} />
            <button className="btn" onClick={() => setSearchOpen(true)}><Icon name="search" className="h-3.5 w-3.5" />Modrinth</button>
            <button className="btn btn-accent" onClick={() => fileRef.current?.click()}><Icon name="upload" className="h-3.5 w-3.5" />Upload jar</button>
            <button className="btn" disabled={busy === 'reload:all'} onClick={() => reloadPlugin('')}><Icon name="refresh" className="h-3.5 w-3.5" />Reload all</button>
          </>
        )}
      />

      <section className="panel overflow-visible">
        <div className="grid grid-cols-1 gap-2 border-b border-soft p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <SearchBar value={query} onChange={setQuery} placeholder="Search plugin..." />
          <div className="flex flex-wrap gap-1.5 text-xs">
            <a className="btn btn-sm" href={apiUrl('/api/plugins/export?format=json')}>JSON</a>
            <a className="btn btn-sm" href={apiUrl('/api/plugins/export?format=xml')}>XML</a>
            <a className="btn btn-sm" href={apiUrl('/api/plugins/export?format=html')}>HTML</a>
            <span className="inline-flex items-center rounded-panel border border-borderc bg-raised px-2.5 text-[11px] text-faint">{meta.loader}/{meta.dir}</span>
          </div>
        </div>

        {filtered.length ? (
          <div className="divide-y divide-soft">
            {filtered.map((plugin) => {
              const name = pluginName(plugin)
              const filename = pluginFile(plugin)
              const canConfig = plugin.config_exists !== false

              return (
                <article key={filename} className="grid grid-cols-1 gap-2 px-3.5 py-3 transition hover:bg-hover/45 md:grid-cols-[minmax(220px,1fr)_120px_minmax(150px,.7fr)_90px_116px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-textc" title={name}>{name}</h3>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${statusClass(plugin)}`}>{plugin.enabled === false ? 'OFF' : 'ON'}</span>
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-faint" title={filename}>{filename}</p>
                  </div>

                  <div className="font-mono text-xs text-dim">{plugin.version || '--'}</div>
                  <div className="truncate text-xs text-dim" title={plugin.author || plugin.description || ''}>{plugin.author || plugin.description || '--'}</div>
                  <div className="font-mono text-xs text-faint">{plugin.size || '--'}</div>

                  <div className="flex gap-1.5 md:justify-end">
                    <SmallIconButton title="Reload plugin" disabled={busy === `reload:${name}`} onClick={() => reloadPlugin(name)}><Icon name="refresh" className="h-3.5 w-3.5" /></SmallIconButton>
                    <SmallIconButton title="Buka config" disabled={!canConfig} onClick={() => openConfig(name)}><Icon name="edit" className="h-3.5 w-3.5" /></SmallIconButton>
                    <SmallIconButton title="Hapus plugin" danger disabled={busy === `delete:${filename}`} onClick={() => deletePlugin(filename)}><Icon name="trash" className="h-3.5 w-3.5" /></SmallIconButton>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Tidak ada plugin" desc="Plugin tidak ditemukan atau belum ada plugin terinstall." />
        )}
      </section>

      {cfg ? (
        <Modal
          title={`Config: ${cfg.name}`}
          size="xl"
          onClose={() => setCfg(null)}
          footer={<><button className="btn" onClick={() => setCfg(null)}>Batal</button><button className="btn btn-accent" onClick={saveConfig}><Icon name="save" className="h-3.5 w-3.5" />Simpan</button></>}
        >
          <textarea
            className="input min-h-[55vh] font-mono text-xs leading-6"
            value={cfg.content}
            onChange={(e) => setCfg((old) => ({ ...old, content: e.target.value }))}
            spellCheck="false"
          />
        </Modal>
      ) : null}

      {searchOpen ? (
        <Modal title="Cari plugin di Modrinth" size="xl" onClose={() => setSearchOpen(false)}>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="input"
                placeholder="Nama plugin/mod..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchPlugin()}
              />
              <button className="btn btn-accent" onClick={searchPlugin} disabled={searching}><Icon name="search" className="h-3.5 w-3.5" />Search</button>
            </div>

            <div className="max-h-[55vh] space-y-2 overflow-auto">
              {searching ? <EmptyState title="Mencari..." desc="Menghubungi Modrinth." /> : null}
              {!searching && results.length ? results.map((item) => (
                <article key={item.project_id} className="rounded-panel border border-soft bg-raised p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-textc">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-dim">{item.description}</p>
                      <p className="mt-2 font-mono text-xs text-faint">Downloads: {item.downloads ?? 0}</p>
                    </div>
                    <button className="btn btn-sm btn-accent shrink-0" disabled={busy === `install:${item.project_id}`} onClick={() => installPlugin(item.project_id)}>Install</button>
                  </div>
                </article>
              )) : null}
              {!searching && !results.length ? <EmptyState title="Belum ada hasil" desc="Masukkan keyword plugin lalu tekan Search." /> : null}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
