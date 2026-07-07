import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { apiUrl, getJson, postJson } from '../api.js'
import { LabeledInput } from '../components/FormFields.jsx'
import Modal from '../components/Modal.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Worlds() {
  const toast = useToast()
  const [worlds, setWorlds] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ world: '', generator: 'normal', seed: '', difficulty: 'normal' })

  const load = useCallback(async () => {
    try {
      setWorlds((await getJson('/api/worlds')).worlds || [])
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function wAction(action, world, extra = '', extraBody = {}) {
    const d = await postJson('/api/world', { action, world, extra, ...extraBody })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) setTimeout(load, 700)
  }

  function promptClone(w) {
    const n = window.prompt('Nama clone baru:')
    if (n) wAction('clone', w, n)
  }

  function promptRename(w) {
    const n = window.prompt('Nama baru:')
    if (n) wAction('rename', w, n)
  }

  async function createWorld() {
    if (!form.world.trim()) return toast('Nama wajib diisi', 'danger')
    await wAction('create', form.world, '', form)
    setCreateOpen(false)
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-muted fw-medium">
          <i className="bi bi-globe2 me-2" />Manajemen World
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setCreateOpen(true)}>
          <i className="bi bi-plus-lg me-1" /> New World
        </button>
      </div>

      <div className="row g-4">
        {worlds.length ? (
          worlds.map((w) => (
            <div className="col-md-4" key={w.name}>
              <div className="card h-100">
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h6 className="fw-semibold text-light mb-1">{w.name}</h6>
                      <div className="text-muted small font-monospace">
                        <i className="bi bi-hdd me-1" /> {w.size}
                      </div>
                    </div>
                    <a href={apiUrl(`/api/worlds/download/${encodeURIComponent(w.name)}`)} className="btn btn-sm btn-outline-secondary border-0 px-2 text-muted">
                      <i className="bi bi-download" />
                    </a>
                  </div>

                  <div className="mt-auto pt-3 border-top d-flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="btn-group w-100">
                      <button className="btn btn-sm btn-outline-secondary w-50 py-1" onClick={() => wAction('load', w.name)}>Load</button>
                      <button className="btn btn-sm btn-outline-secondary w-50 py-1" onClick={() => wAction('unload', w.name)}>Unload</button>
                    </div>
                    <div className="btn-group w-100">
                      <button className="btn btn-sm btn-outline-secondary py-1" onClick={() => wAction('save', w.name)}><i className="bi bi-floppy" /></button>
                      <button className="btn btn-sm btn-outline-secondary py-1" onClick={() => promptClone(w.name)}><i className="bi bi-copy" /></button>
                      <button className="btn btn-sm btn-outline-secondary py-1" onClick={() => promptRename(w.name)}><i className="bi bi-pencil" /></button>
                      <button className="btn btn-sm btn-outline-secondary py-1 text-danger" onClick={() => window.confirm(`Yakin hapus ${w.name}?`) && wAction('delete', w.name)}><i className="bi bi-trash" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="card p-5 text-center text-muted small">World belum terdeteksi.</div>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Generate World Baru" size="modal-panel-sm">
        <div className="p-4">
          <LabeledInput label="Nama World" value={form.world} onChange={(v) => setForm({ ...form, world: v })} placeholder="my_world_new" />

          <label className="form-label small text-muted fw-medium">Tipe Generator</label>
          <select className="form-select mb-3" value={form.generator} onChange={(e) => setForm({ ...form, generator: e.target.value })}>
            <option value="normal">Normal / Default</option>
            <option value="flat">Superflat</option>
            <option value="amplified">Amplified</option>
            <option value="largebiomes">Large Biomes</option>
            <option value="void">Void (Empty)</option>
          </select>

          <LabeledInput label="Custom Seed" value={form.seed} onChange={(v) => setForm({ ...form, seed: v })} placeholder="Kosong = Random" />

          <label className="form-label small text-muted fw-medium">Difficulty</label>
          <select className="form-select mb-4" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option>peaceful</option>
            <option>normal</option>
            <option>easy</option>
            <option>hard</option>
          </select>

          <button className="btn btn-primary w-100" onClick={createWorld}>Generate</button>
        </div>
      </Modal>
    </>
  )
}
