import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { apiUrl, getJson, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Backups() {
  const toast = useToast()
  const [backups, setBackups] = useState([])

  const load = useCallback(async () => {
    try {
      setBackups((await getJson('/api/backup/list')).backups || [])
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function createBackup(type) {
    const d = await postJson('/api/backup/create', { type })
    toast(d.message, d.success ? 'success' : 'danger')
    setTimeout(load, 2000)
  }

  async function restoreBackup(filename) {
    const d = await postJson('/api/backup/restore', { filename })
    toast(d.message, d.success ? 'success' : 'danger')
  }

  async function deleteBackup(filename) {
    const d = await postJson('/api/backup/delete', { filename })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) load()
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header border-0 pb-3 pt-4 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <span className="text-muted fw-medium">
          <i className="bi bi-archive me-2" />Daftar Backup ZIP
        </span>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => createBackup('world')}><i className="bi bi-globe2 me-1" /> World Only</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => createBackup('plugins')}><i className="bi bi-puzzle me-1" /> Plugins Only</button>
          <button className="btn btn-sm btn-primary" onClick={() => createBackup('full')}><i className="bi bi-server me-1" /> Full Backup</button>
        </div>
      </div>

      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr><th className="ps-4">Nama File Archive</th><th>Ukuran</th><th>Dibuat</th><th className="text-end pe-4">Aksi</th></tr>
            </thead>
            <tbody>
              {backups.length ? (
                backups.map((b) => (
                  <tr key={b.filename}>
                    <td className="ps-4 text-light fw-medium"><i className="bi bi-file-earmark-zip me-2 text-muted" />{b.filename}</td>
                    <td className="font-monospace text-muted small">{b.size}</td>
                    <td className="text-muted small">{b.created}</td>
                    <td className="text-end pe-4">
                      <a href={apiUrl(`/api/backup/download/${encodeURIComponent(b.filename)}`)} className="btn btn-sm btn-outline-secondary py-1 px-2 me-1"><i className="bi bi-download" /></a>
                      <button className="btn btn-sm btn-outline-secondary py-1 px-2 me-1 text-info" onClick={() => window.confirm(`Restore ${b.filename} dan timpa yang sekarang?`) && restoreBackup(b.filename)}><i className="bi bi-arrow-counterclockwise" /></button>
                      <button className="btn btn-sm btn-outline-secondary py-1 px-2 text-danger border-0" onClick={() => window.confirm(`Hapus selamanya ${b.filename}?`) && deleteBackup(b.filename)}><i className="bi bi-trash" /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="text-center text-muted py-5 small">Belum ada backup archive yang tersimpan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
