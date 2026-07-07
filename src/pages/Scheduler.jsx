import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { getJson, postJson } from '../api.js'
import { LabeledInput } from '../components/FormFields.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

export default function Scheduler() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({ id: '', name: '', task_type: 'restart', cron: '' })
  const [payload, setPayload] = useState('')
  const [backupType, setBackupType] = useState('world')

  const load = useCallback(async () => {
    try {
      setJobs((await getJson('/api/scheduler')).jobs || [])
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function addJob() {
    const kwargs = {}
    if (form.task_type === 'broadcast') kwargs.message = payload
    if (form.task_type === 'command') kwargs.command = payload
    if (form.task_type === 'backup') kwargs.backup_type = backupType

    const d = await postJson('/api/scheduler/add', { ...form, name: form.name || form.id, kwargs })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) load()
  }

  async function removeJob(id) {
    const d = await postJson('/api/scheduler/remove', { id })
    toast(d.message, d.success ? 'success' : 'danger')
    if (d.success) load()
  }

  return (
    <div className="row g-4">
      <div className="col-md-4">
        <div className="card h-100">
          <div className="card-header border-0 pb-0 pt-4 px-4 text-muted">
            <i className="bi bi-plus-circle me-2" />Add Task
          </div>

          <div className="card-body px-4 pt-3 pb-4">
            <LabeledInput label="Task ID" value={form.id} onChange={(v) => setForm({ ...form, id: v })} placeholder="daily_restart" />
            <LabeledInput label="Display Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Daily Restart" />

            <label className="form-label small text-muted fw-medium">Action Type</label>
            <select className="form-select mb-3" value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
              <option value="restart">Restart Server</option>
              <option value="save_all">Save All</option>
              <option value="broadcast">Broadcast Message</option>
              <option value="backup">Backup</option>
              <option value="command">Execute Command</option>
              <option value="shutdown">Shutdown</option>
            </select>

            {['broadcast', 'command'].includes(form.task_type) && (
              <LabeledInput
                label={form.task_type === 'broadcast' ? 'Message Payload' : 'Command Payload'}
                value={payload}
                onChange={setPayload}
                placeholder={form.task_type === 'broadcast' ? 'Server restart sebentar!' : 'say Hello'}
              />
            )}

            {form.task_type === 'backup' && (
              <>
                <label className="form-label small text-muted fw-medium">Backup Scope</label>
                <select className="form-select mb-3" value={backupType} onChange={(e) => setBackupType(e.target.value)}>
                  <option value="world">World Only</option>
                  <option value="plugins">Plugins Only</option>
                  <option value="full">Full Server</option>
                </select>
              </>
            )}

            <LabeledInput label="Cron Expression (m h d M w)" value={form.cron} onChange={(v) => setForm({ ...form, cron: v })} placeholder="0 4 * * *" />

            <div className="mt-2 mb-4 d-flex gap-2 flex-wrap">
              <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setForm({ ...form, cron: '0 4 * * *' })}>Daily 4AM</button>
              <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setForm({ ...form, cron: '0 */6 * * *' })}>Every 6h</button>
              <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setForm({ ...form, cron: '0 0 * * 0' })}>Weekly</button>
            </div>

            <button className="btn btn-primary w-100" onClick={addJob}>Submit Job</button>
          </div>
        </div>
      </div>

      <div className="col-md-8">
        <div className="card h-100">
          <div className="card-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
            <span className="text-muted"><i className="bi bi-list-task me-2" />Active Jobs</span>
            <button className="btn btn-sm btn-outline-secondary px-2 py-1" onClick={load}><i className="bi bi-arrow-clockwise" /></button>
          </div>

          <div className="card-body px-0 pt-3">
            <table className="table mb-0">
              <thead>
                <tr><th className="ps-4">ID / Name</th><th>Cron Trigger</th><th>Next Run</th><th className="text-end pe-4">Action</th></tr>
              </thead>
              <tbody>
                {jobs.length ? (
                  jobs.map((j) => (
                    <tr key={j.id}>
                      <td className="ps-4">
                        <div className="fw-medium text-light">{j.name}</div>
                        <div className="font-monospace text-muted" style={{ fontSize: '.7rem' }}>{j.id}</div>
                      </td>
                      <td><span className="badge bg-transparent border text-muted font-monospace" style={{ borderColor: 'var(--border)' }}>{j.trigger}</span></td>
                      <td className="small text-muted">{j.next_run}</td>
                      <td className="text-end pe-4">
                        <button className="btn btn-sm btn-outline-secondary text-danger py-1 px-2" onClick={() => removeJob(j.id)}><i className="bi bi-x-lg" /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="text-center text-muted py-5 small">Belum ada cron job terjadwal.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
