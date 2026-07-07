import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { getJson, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'

function Metric({ title, value, suffix }) {
  return (
    <div className="col-6 col-md-3">
      <div className="card h-100 p-2">
        <div className="card-body">
          <div className="text-muted small fw-medium mb-1">{title}</div>
          <div className="d-flex align-items-baseline gap-1">
            <div className="fs-2 fw-semibold text-light">{value}</div>
            <span className="text-muted">{suffix}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoLine({ k, v, small, mono, last }) {
  return (
    <div
      className={`d-flex justify-content-between py-2 ${last ? '' : 'border-bottom'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="text-muted">{k}</span>
      <span
        className={`fw-medium text-end ${small ? 'small' : ''} ${mono ? 'font-monospace small' : ''}`}
        style={{ maxWidth: '65%' }}
      >
        {v}
      </span>
    </div>
  )
}

function normalizePlayer(player) {
  if (typeof player === 'string') {
    return {
      name: player,
      valid: true,
      health: null,
      food: null,
      level: null,
      dimension: null,
      position: null,
    }
  }

  if (player && typeof player === 'object') {
    return {
      name: player.name || player.username || 'Unknown',
      valid: player.valid ?? true,
      health: player.health ?? null,
      food: player.food ?? null,
      level: player.level ?? null,
      dimension: player.dimension ?? null,
      position: player.position ?? null,
    }
  }

  return {
    name: String(player || 'Unknown'),
    valid: false,
    health: null,
    food: null,
    level: null,
    dimension: null,
    position: null,
  }
}

function formatPosition(position) {
  if (!position || typeof position !== 'object') return ''

  const x = position.x ?? '-'
  const y = position.y ?? '-'
  const z = position.z ?? '-'

  return `${x}, ${y}, ${z}`
}

export default function Dashboard() {
  const toast = useToast()
  const [d, setD] = useState(null)
  const [players, setPlayers] = useState([])

  const fetchDash = useCallback(async () => {
    try {
      setD(await getJson('/api/status'))
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
    fetchDash()
    loadPlayers()

    const id = setInterval(() => {
      fetchDash()
      loadPlayers()
    }, 5000)

    return () => clearInterval(id)
  }, [fetchDash, loadPlayers])

  async function srvAction(action) {
    try {
      const r = await postJson(`/api/${action}`)
      toast(r.message || r.response || 'OK', r.success ? 'success' : 'danger')
      setTimeout(fetchDash, 700)
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  const status = d?.status || 'Loading...'
  const badge = status === 'ONLINE'
    ? 'bg-success'
    : status === 'STARTING'
      ? 'bg-warning text-dark'
      : 'bg-danger'

  return (
    <>
      <div className="card mb-4 p-2">
        <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="text-muted small text-uppercase fw-semibold" style={{ letterSpacing: '.5px' }}>
              Server Status
            </span>

            <div className="d-flex align-items-center gap-2 mt-1">
              <span className={`badge px-3 py-2 ${badge}`}>{status}</span>
              <span className="text-muted small ms-2">
                <i className="bi bi-clock-history me-1" /> {d?.uptime || '--'}
              </span>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-success" onClick={() => srvAction('start')}>
              <i className="bi bi-play-fill" /> Start
            </button>

            <button className="btn btn-outline-secondary" onClick={() => srvAction('restart')}>
              <i className="bi bi-arrow-clockwise" /> Restart
            </button>

            <button className="btn btn-outline-secondary" onClick={() => srvAction('stop')}>
              <i className="bi bi-stop-fill" /> Stop
            </button>

            <button
              className="btn btn-danger"
              onClick={() => window.confirm('Kill paksa proses Java?') && srvAction('kill')}
            >
              <i className="bi bi-lightning-fill" /> Kill
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <Metric title="CPU Load" value={d?.cpu_pct ?? '--'} suffix="%" />
        <Metric title="System RAM" value={d?.ram_pct ?? '--'} suffix="%" />
        <Metric title="Java Heap" value={d?.java_ram ?? '--'} suffix="MB" />
        <Metric title="Performance" value={d?.tps ?? '--'} suffix={`MSPT ${d?.mspt ?? '--'}`} />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header border-0 pb-0 pt-4 px-4">
              <i className="bi bi-hdd-network me-2 text-muted" /> System Info
            </div>

            <div className="card-body px-4">
              <InfoLine k="Minecraft" v={d?.mc_ver || '--'} />
              <InfoLine k="Software" v={d?.paper_ver || '--'} />
              <InfoLine k="Java Version" v={d?.java_ver || '--'} small />
              <InfoLine k="Storage" v={d?.disk_used || '--'} />
              <InfoLine k="Endpoint" v={`${d?.server_ip || '--'}:${d?.server_port || '--'}`} mono last />
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-header border-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-people me-2 text-muted" /> Players ({players.length})
              </span>

              <button className="btn btn-sm btn-outline-secondary py-1" onClick={loadPlayers}>
                <i className="bi bi-arrow-clockwise" />
              </button>
            </div>

            <div className="card-body px-4 pt-3">
              <div className="d-flex flex-wrap gap-2">
                {players.length ? (
                  players.map((p) => (
                    <span
                      key={p.name}
                      className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1"
                      title={[
                        p.dimension ? `World: ${p.dimension}` : '',
                        p.health !== null ? `Health: ${p.health}` : '',
                        p.level !== null ? `Level: ${p.level}` : '',
                      ].filter(Boolean).join(' | ')}
                    >
                      <i className="bi bi-person" />
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-muted small">Tidak ada player online.</span>
                )}
              </div>

              {players.length ? (
                <div className="mt-3 d-flex flex-column gap-2">
                  {players.map((p) => (
                    <div key={`${p.name}-detail`} className="small text-muted d-flex justify-content-between gap-3">
                      <span className="text-light">{p.name}</span>
                      <span className="font-monospace text-end">
                        {p.dimension || '-'} {p.position ? `@ ${formatPosition(p.position)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}