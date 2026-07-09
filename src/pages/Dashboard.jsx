import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import StatCard from '../components/StatCard.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { clampPct, num } from '../utils/format.js'
import { formatPosition, normalizePlayer } from '../utils/players.js'

function statusTone(status) {
  if (status === 'ONLINE') return 'good'
  if (status === 'STARTING') return 'warn'
  return 'danger'
}

function RuntimeRow({ label, value, mono = false }) {
  return (
    <div className="runtime-row">
      <span>{label}</span>
      <strong className={mono ? 'font-monospace' : ''}>{value || '--'}</strong>
    </div>
  )
}

function ActionButton({ label, tone = 'outline-secondary', onClick, disabled }) {
  return (
    <button className={`btn btn-sm btn-${tone}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

export default function Dashboard() {
  const toast = useToast()
  const [status, setStatus] = useState(null)
  const [players, setPlayers] = useState([])
  const [busy, setBusy] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      setStatus(await getJson('/api/status'))
    } catch (e) {
      toast(e.message, 'danger')
    }
  }, [toast])

  const loadPlayers = useCallback(async () => {
    try {
      const data = await getJson('/api/players')
      const rows = Array.isArray(data.players)
        ? data.players.map(normalizePlayer).filter((p) => p.name)
        : []
      setPlayers(rows)
    } catch {
      setPlayers([])
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    loadPlayers()
    const id = setInterval(() => {
      fetchStatus()
      loadPlayers()
    }, 5000)
    return () => clearInterval(id)
  }, [fetchStatus, loadPlayers])

  async function serverAction(action) {
    if (action === 'kill' && !window.confirm('Kill paksa proses Java?')) return

    setBusy(action)
    try {
      const result = await postJson(`/api/${action}`)
      toast(result.message || result.response || 'Command dikirim.', result.success ? 'success' : 'danger')
      setTimeout(() => {
        fetchStatus()
        loadPlayers()
      }, 800)
    } catch (e) {
      toast(e.message, 'danger')
    } finally {
      setBusy('')
    }
  }

  const serverStatus = status?.status || 'Loading...'
  const tone = statusTone(serverStatus)
  const endpoint = `${status?.server_ip || '--'}:${status?.server_port || '--'}`
  const stateText = useMemo(() => {
    const tps = Number(status?.tps)
    const mspt = Number(status?.mspt)
    if (!status || serverStatus !== 'ONLINE') return 'Server tidak sedang online.'
    if (!Number.isNaN(tps) && tps < 18) return 'TPS sedang turun. Cek chunk generation atau plugin berat.'
    if (!Number.isNaN(mspt) && mspt > 50) return 'MSPT melewati 50 ms. Server mulai terbebani.'
    return 'Server online dan terbaca normal.'
  }, [status, serverStatus])

  return (
    <div className="dashboard-page">
      <section className="status-strip">
        <div className="status-strip-main">
          <span className={`status-dot ${tone}`} />
          <div>
            <div className="status-strip-title">{serverStatus}</div>
            <div className="status-strip-subtitle">{stateText}</div>
          </div>
        </div>

        <div className="status-actions">
          <ActionButton label="Start" tone="success" onClick={() => serverAction('start')} disabled={!!busy} />
          <ActionButton label="Restart" onClick={() => serverAction('restart')} disabled={!!busy} />
          <ActionButton label="Stop" onClick={() => serverAction('stop')} disabled={!!busy} />
          <ActionButton label="Kill" tone="danger" onClick={() => serverAction('kill')} disabled={!!busy} />
        </div>
      </section>

      <div className="stat-grid mt-3">
        <StatCard label="CPU" value={num(status?.cpu_pct)} suffix="%" tone={Number(status?.cpu_pct) > 80 ? 'danger' : 'neutral'} progress={clampPct(status?.cpu_pct)} />
        <StatCard label="RAM" value={num(status?.ram_pct)} suffix="%" tone={Number(status?.ram_pct) > 85 ? 'danger' : 'neutral'} progress={clampPct(status?.ram_pct)} />
        <StatCard label="Java" value={num(status?.java_ram)} suffix="MB" hint="Heap" />
        <StatCard label="TPS" value={status?.tps || '--'} suffix="" hint={`MSPT ${status?.mspt || '--'}`} tone={Number(status?.tps) < 18 ? 'warn' : 'good'} />
      </div>

      <div className="row g-3 mt-1">
        <div className="col-lg-7">
          <div className="panel-card h-100">
            <div className="panel-head compact">
              <div>
                <h3>Runtime</h3>
                <p>Informasi server yang sedang dibaca backend.</p>
              </div>
            </div>
            <div className="runtime-grid">
              <RuntimeRow label="Minecraft" value={status?.mc_ver} />
              <RuntimeRow label="Software" value={status?.paper_ver} />
              <RuntimeRow label="Java" value={status?.java_ver} />
              <RuntimeRow label="Disk" value={status?.disk_used} />
              <RuntimeRow label="Endpoint" value={endpoint} mono />
              <RuntimeRow label="Uptime" value={status?.uptime} />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card h-100">
            <div className="panel-head compact">
              <div>
                <h3>Players</h3>
                <p>{players.length} online</p>
              </div>
              <button className="btn btn-sm btn-soft" onClick={loadPlayers}>Refresh</button>
            </div>

            {players.length ? (
              <div className="player-stack dense">
                {players.map((p) => (
                  <div className="player-mini" key={p.name}>
                    <div className="d-flex align-items-center justify-content-between gap-2">
                      <div className="player-mini-name">{p.name}</div>
                      <span className="role-chip">{p.role || 'Member'}</span>
                    </div>
                    <div className="player-mini-meta">
                      <span>{p.dimension || '-'}</span>
                      <span className="font-monospace">{formatPosition(p.position)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Tidak ada player online" description="Player muncul setelah /api/players berhasil terbaca." />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
