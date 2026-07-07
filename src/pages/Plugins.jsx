import React from "react"
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl, getJson, postForm, postJson } from '../api.js'
import Modal from '../components/Modal.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Plugins() {
  const toast = useToast()
  const [plugins, setPlugins] = useState([])
  const [meta, setMeta] = useState({ dir: 'plugins', loader: 'paper' })
  const [cfg, setCfg] = useState({ open: false, name: '', content: '' })
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const d = await getJson('/api/plugins')
      setPlugins(d.plugins || [])
      setMeta({ dir: d.dir, loader: d.loader })
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function reloadPlugin(name = '') {
    const d = await postJson('/api/plugin/reload', { name })
    toast(d.message, d.success ? 'success' : 'danger')
  }

  async function delPlugin(filename) {
    const d = await postJson('/api/plugin/delete', { filename })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) load()
  }

  async function editConfig(name) {
    const d = await getJson(`/api/plugin/config/${encodeURIComponent(name)}`)
    if (!d.success) return toast(d.message, 'danger')
    setCfg({ open: true, name, content: d.content || '' })
  }

  async function saveConfig() {
    const d = await postJson(`/api/plugin/config/${encodeURIComponent(cfg.name)}`, { content: cfg.content })
    toast(d.message, d.success ? 'success' : 'danger')
  }

  async function uploadPlugin() {
    const f = fileRef.current?.files?.[0]
    if (!f) return

    const fd = new FormData()
    fd.append('file', f)

    const d = await postForm('/api/plugins/upload', fd)
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) {
      fileRef.current.value = ''
      load()
    }
  }

  async function searchPlugin() {
    if (!search.trim()) return

    setLoading(true)
    try {
      const d = await getJson(`/api/plugin/search?q=${encodeURIComponent(search.trim())}`)
      if (!d.success) toast(d.message, 'danger')
      setResults(d.results || [])
    } finally {
      setLoading(false)
    }
  }

  async function installPlugin(projectId) {
    const d = await postJson('/api/plugin/download', { project_id: projectId })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) load()
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="text-muted fw-medium">
          <i className="bi bi-puzzle me-2" />Terinstall ({plugins.length})
          <span className="badge bg-transparent border text-muted ms-2">{meta.loader}/{meta.dir}</span>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button className="btn btn-sm btn-primary" onClick={() => setSearchOpen(true)}>
            <i className="bi bi-search me-1" /> Modrinth
          </button>
          <div className="btn-group">
            <a className="btn btn-sm btn-outline-secondary" href={apiUrl('/api/plugins/export?format=json')}>JSON</a>
            <a className="btn btn-sm btn-outline-secondary" href={apiUrl('/api/plugins/export?format=xml')}>XML</a>
            <a className="btn btn-sm btn-outline-secondary" href={apiUrl('/api/plugins/export?format=html')}>HTML</a>
          </div>
          <input ref={fileRef} type="file" accept=".jar" className="form-control form-control-sm" style={{ width: 180 }} />
          <button className="btn btn-sm btn-outline-secondary" onClick={uploadPlugin}><i className="bi bi-upload" /></button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => reloadPlugin('')}><i className="bi bi-arrow-clockwise" /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr><th>Plugin Name</th><th>Version</th><th>Author</th><th>Size</th><th className="text-end">Actions</th></tr>
            </thead>
            <tbody>
              {plugins.length ? (
                plugins.map((p) => (
                  <tr key={p.filename}>
                    <td>
                      <div className="fw-semibold text-light">{p.name}</div>
                      <div className="text-muted" style={{ fontSize: '.75rem' }}>{String(p.description || '').slice(0, 80)}</div>
                    </td>
                    <td><span className="badge bg-transparent border text-muted" style={{ borderColor: 'var(--border)' }}>{p.version}</span></td>
                    <td className="text-muted">{p.author}</td>
                    <td className="font-monospace text-muted small">{p.size}</td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary py-1" onClick={() => reloadPlugin(p.name)}><i className="bi bi-arrow-clockwise" /></button>
                        {p.config_exists && <button className="btn btn-sm btn-outline-secondary py-1" onClick={() => editConfig(p.name)}><i className="bi bi-sliders" /></button>}
                        <button className="btn btn-sm btn-outline-secondary text-danger py-1" onClick={() => window.confirm(`Hapus ${p.filename}?`) && delPlugin(p.filename)}><i className="bi bi-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center text-muted py-4 small">Belum ada plugin/mod terinstall.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={cfg.open} onClose={() => setCfg({ open: false, name: '', content: '' })} title={<span className="font-monospace small text-muted">config.yml <span className="text-light ms-2">{cfg.name}</span></span>} size="modal-panel-lg">
        <textarea
          className="form-control border-0 rounded-0"
          rows="18"
          style={{ background: 'transparent', color: '#d4d4d8', fontFamily: 'JetBrains Mono, monospace', fontSize: '.8rem', padding: '1rem', resize: 'none' }}
          value={cfg.content}
          onChange={(e) => setCfg({ ...cfg, content: e.target.value })}
        />
        <div className="p-2 border-top text-end" style={{ borderColor: 'var(--border)' }}>
          <button className="btn btn-sm btn-primary px-4" onClick={saveConfig}>Simpan</button>
        </div>
      </Modal>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Cari di Modrinth" size="modal-panel-lg">
        <div className="p-4">
          <div className="input-group mb-4">
            <input
              className="form-control"
              placeholder="Nama plugin/mod..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchPlugin()}
            />
            <button className="btn btn-primary px-3" onClick={searchPlugin}><i className="bi bi-search" /></button>
          </div>

          <div className="d-flex flex-column gap-2" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center text-muted py-4 small">Mencari...</div>
            ) : results.length ? (
              results.map((r) => (
                <div key={r.project_id} className="card p-3">
                  <div className="d-flex justify-content-between gap-3">
                    <div>
                      <div className="fw-semibold">{r.title}</div>
                      <div className="text-muted small">{r.description}</div>
                      <div className="text-muted small mt-2">Downloads: {r.downloads ?? 0}</div>
                    </div>
                    <button className="btn btn-sm btn-primary align-self-start" onClick={() => installPlugin(r.project_id)}>Install</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted py-4 small">Hasil pencarian akan muncul di sini.</div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
