import React, { useCallback, useEffect, useState } from 'react'
import { apiUrl, getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Backups() {
  const toast = useToast()
  const [backups, setBackups] = useState([])
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try { setBackups((await getJson('/api/backup/list')).backups || []) } catch (e) { toast(e.message || 'Gagal memuat backup', 'danger') }
  }, [toast])
  useEffect(() => { load() }, [load])

  async function act(action, body = {}) {
    setBusy(action)
    try {
      const d = await postJson(`/api/backup/${action}`, body)
      toast(d.message || 'OK', d.success === false ? 'danger' : 'success')
      await load()
    } catch (e) { toast(e.message || 'Aksi backup gagal', 'danger') } finally { setBusy('') }
  }

  return <div>
    <PageHeader eyebrow="Backups" title="Backup Manager" desc="Buat, restore, hapus, dan download backup server." actions={<><button className="btn btn-accent" disabled={busy === 'create'} onClick={() => act('create', { type: 'full' })}><Icon name="plus" className="h-3.5 w-3.5" />Create backup</button><button className="btn" onClick={load}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button></>} />
    <section className="panel">
      <div className="panel-head"><h3 className="panel-title">Daftar Backup</h3><span className="chip">{backups.length}</span></div>
      {backups.length ? <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">{backups.map((b) => { const filename = b.filename || b.name || String(b); return <article key={filename} className="rounded-panel border border-soft bg-raised p-3"><div className="min-w-0"><h3 className="truncate font-mono text-sm font-semibold text-textc">{filename}</h3><p className="mt-1 text-xs text-faint">{b.size || b.size_text || '--'} · {b.created_at || b.modified || '--'}</p></div><div className="mt-3 grid grid-cols-3 gap-1.5"><a className="btn btn-sm" href={apiUrl(`/api/backup/download/${encodeURIComponent(filename)}`)} target="_blank" rel="noreferrer">Download</a><button className="btn btn-sm" onClick={() => act('restore', { filename })}>Restore</button><button className="btn btn-sm btn-danger" onClick={() => act('delete', { filename })}>Delete</button></div></article> })}</div> : <EmptyState title="Belum ada backup" desc="Klik Create backup untuk membuat backup pertama." />}
    </section>
  </div>
}
