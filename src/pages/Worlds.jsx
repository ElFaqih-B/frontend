import React, { useCallback, useEffect, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Worlds() {
  const toast = useToast()
  const [worlds, setWorlds] = useState([])
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState({ name: '', env: 'NORMAL' })

  const load = useCallback(async () => {
    try { setWorlds((await getJson('/api/worlds')).worlds || []) } catch (e) { toast(e.message || 'Gagal memuat worlds', 'danger') }
  }, [toast])
  useEffect(() => { load() }, [load])

  async function act(action, world, extraBody = {}) {
    setBusy(`${action}:${world}`)
    try {
      const d = await postJson('/api/world', { action, world, ...extraBody })
      toast(d.message || 'OK', d.success === false ? 'danger' : 'success')
      await load()
    } catch (e) { toast(e.message || 'Aksi world gagal', 'danger') } finally { setBusy('') }
  }

  async function createWorld(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await act('create', form.name.trim(), { extra: form.env })
    setForm({ name: '', env: 'NORMAL' })
  }

  return (
    <div>
      <PageHeader eyebrow="Worlds" title="World Manager" desc="Load, unload, teleport, dan buat world dari dashboard." actions={<button className="btn" onClick={load}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button>} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
        <section className="panel">
          <div className="panel-head"><h3 className="panel-title">Daftar World</h3><span className="chip">{worlds.length}</span></div>
          {worlds.length ? <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
            {worlds.map((w) => {
              const name = w.name || w.world || String(w)
              const loaded = w.loaded ?? w.is_loaded ?? true
              return <article key={name} className="rounded-panel border border-soft bg-raised p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-textc">{name}</h3><p className="mt-1 font-mono text-xs text-faint">{w.environment || w.env || 'world'} · {loaded ? 'loaded' : 'unloaded'}</p></div>
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${loaded ? 'border-green/40 text-green' : 'border-faint/40 text-faint'}`}>{loaded ? 'ON' : 'OFF'}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                  <button className="btn btn-sm" disabled={busy === `load:${name}`} onClick={() => act('load', name)}>Load</button>
                  <button className="btn btn-sm" disabled={busy === `unload:${name}`} onClick={() => act('unload', name)}>Unload</button>
                  <button className="btn btn-sm btn-accent" disabled={busy === `tp:${name}`} onClick={() => act('tp', name)}>Teleport</button>
                  <button className="btn btn-sm btn-danger" disabled={busy === `delete:${name}`} onClick={() => act('delete', name)}>Delete</button>
                </div>
              </article>
            })}
          </div> : <EmptyState title="World kosong" desc="Belum ada data world." />}
        </section>
        <form onSubmit={createWorld} className="panel-pad h-fit">
          <h3 className="text-sm font-semibold">Buat world</h3>
          <p className="mt-1 text-xs text-faint">Nama world baru untuk Multiverse.</p>
          <div className="mt-3 space-y-3"><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="nama_world" /><select className="select" value={form.env} onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}><option>NORMAL</option><option>NETHER</option><option>THE_END</option></select><button className="btn btn-accent w-full"><Icon name="plus" className="h-3.5 w-3.5" />Create</button></div>
        </form>
      </div>
    </div>
  )
}
