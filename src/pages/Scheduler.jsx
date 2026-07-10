import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const TASK_OPTIONS = [
  { value: 'backup', label: 'Backup' },
  { value: 'restart', label: 'Restart server' },
  { value: 'command', label: 'Command' },
  { value: 'broadcast', label: 'Broadcast message' },
  { value: 'save_all', label: 'Save all' },
  { value: 'shutdown', label: 'Shutdown' },
]

const PRESETS = [
  ['Tiap 60 menit', 60],
  ['Tiap 6 jam', 360],
  ['Tiap 12 jam', 720],
]

function minutesToCron(minutes) {
  const n = Math.max(1, Number(minutes || 60))
  if (n < 60) return `*/${n} * * * *`
  if (n % 1440 === 0) return '0 4 * * *'
  if (n % 60 === 0) return `0 */${Math.max(1, n / 60)} * * *`
  return `*/${Math.min(n, 59)} * * * *`
}

function jobSubtitle(job) {
  return job.trigger || job.next_run || job.next_run_time || job.func || job.task_type || '--'
}

export default function Scheduler() {
  const toast = useToast()
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState({
    id: '',
    name: '',
    task_type: 'backup',
    minutes: 60,
    cron: '',
    command: '',
    message: '',
    backup_type: 'world',
  })

  const load = useCallback(async () => {
    try {
      const data = await getJson('/api/scheduler')
      setJobs(Array.isArray(data.jobs) ? data.jobs : [])
    } catch (e) {
      toast(e.message || 'Gagal memuat scheduler.', 'danger')
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const finalCron = useMemo(() => form.cron.trim() || minutesToCron(form.minutes), [form.cron, form.minutes])

  function patch(next) {
    setForm((old) => ({ ...old, ...next }))
  }

  async function add(e) {
    e.preventDefault()

    const id = form.id.trim()
    if (!id) return toast('ID job wajib diisi.', 'danger')
    if (form.task_type === 'command' && !form.command.trim()) return toast('Command wajib diisi.', 'danger')
    if (form.task_type === 'broadcast' && !form.message.trim()) return toast('Pesan broadcast wajib diisi.', 'danger')

    const kwargs = {
      minutes: Number(form.minutes || 60),
      command: form.command.trim(),
      message: form.message.trim(),
      backup_type: form.backup_type,
    }

    const payload = {
      id,
      name: form.name.trim() || id,
      func: form.task_type,
      task_type: form.task_type,
      trigger: 'interval',
      minutes: Number(form.minutes || 60),
      cron: finalCron,
      kwargs,
      command: form.command.trim(),
      message: form.message.trim(),
    }

    try {
      const data = await postJson('/api/scheduler/add', payload)
      toast(data.message || 'Job ditambahkan.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) {
        setForm({ id: '', name: '', task_type: 'backup', minutes: 60, cron: '', command: '', message: '', backup_type: 'world' })
        load()
      }
    } catch (err) {
      toast(err.message || 'Gagal menambah job.', 'danger')
    }
  }

  async function remove(id) {
    if (!window.confirm(`Hapus job ${id}?`)) return
    try {
      const data = await postJson('/api/scheduler/remove', { id })
      toast(data.message || 'Job dihapus.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) load()
    } catch (e) {
      toast(e.message || 'Gagal hapus job.', 'danger')
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="Scheduler" title="Task Scheduler" desc="Atur backup, restart, broadcast, atau command terjadwal." actions={<button className="btn" onClick={load}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button>} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Jobs</h3>
              <p className="panel-subtitle">Daftar task yang sedang aktif.</p>
            </div>
            <span className="chip">{jobs.length}</span>
          </div>

          {jobs.length ? (
            <div className="divide-y divide-soft">
              {jobs.map((job) => (
                <article key={job.id} className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-textc">{job.name || job.id}</div>
                    <div className="truncate font-mono text-xs text-faint">{job.id} · {jobSubtitle(job)}</div>
                    {job.next_run || job.next_run_time ? <div className="mt-1 text-xs text-dim">Next: {job.next_run || job.next_run_time}</div> : null}
                  </div>
                  <button className="btn btn-sm btn-danger shrink-0" onClick={() => remove(job.id)}><Icon name="trash" className="h-3.5 w-3.5" />Remove</button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada job" desc="Tambahkan job di panel kanan." />
          )}
        </section>

        <form onSubmit={add} className="panel h-fit">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Tambah job</h3>
              <p className="panel-subtitle">Command punya kolom payload sendiri.</p>
            </div>
          </div>

          <div className="space-y-3 p-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">ID</span><input className="input" placeholder="night_message" value={form.id} onChange={(e) => patch({ id: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">Nama</span><input className="input" placeholder="Pesan malam" value={form.name} onChange={(e) => patch({ name: e.target.value })} /></label>

            <div>
              <span className="mb-1 block text-xs font-semibold text-dim">Task</span>
              <SelectMenu value={form.task_type} onChange={(value) => patch({ task_type: value })} options={TASK_OPTIONS} />
            </div>

            {form.task_type === 'command' ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-dim">Command</span>
                <textarea className="input min-h-20 font-mono text-xs leading-6" placeholder="say halo gaesss, waktunya tidurrr woy" value={form.command} onChange={(e) => patch({ command: e.target.value })} />
                <span className="mt-1 block text-[11px] text-faint">Tulis command tanpa slash. Contoh: <b>say halo gaesss</b></span>
              </label>
            ) : null}

            {form.task_type === 'broadcast' ? (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-dim">Pesan broadcast</span>
                <textarea className="input min-h-20" placeholder="Server restart 5 menit lagi!" value={form.message} onChange={(e) => patch({ message: e.target.value })} />
              </label>
            ) : null}

            {form.task_type === 'backup' ? (
              <div>
                <span className="mb-1 block text-xs font-semibold text-dim">Backup scope</span>
                <SelectMenu value={form.backup_type} onChange={(value) => patch({ backup_type: value })} options={[{ value: 'world', label: 'World only' }, { value: 'plugins', label: 'Plugins only' }, { value: 'full', label: 'Full server' }]} />
              </div>
            ) : null}

            <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">Interval menit</span><input className="input font-mono" type="number" min="1" value={form.minutes} onChange={(e) => patch({ minutes: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">Cron optional</span><input className="input font-mono" placeholder={minutesToCron(form.minutes)} value={form.cron} onChange={(e) => patch({ cron: e.target.value })} /><span className="mt-1 block font-mono text-[11px] text-faint">Dipakai: {finalCron}</span></label>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(([label, minutes]) => <button key={label} type="button" className="btn btn-sm" onClick={() => patch({ minutes, cron: '' })}>{label}</button>)}
            </div>

            <button className="btn btn-accent w-full"><Icon name="plus" className="h-3.5 w-3.5" />Tambah</button>
          </div>
        </form>
      </div>
    </div>
  )
}
