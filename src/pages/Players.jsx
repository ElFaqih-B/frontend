import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { getJson, postJson } from '../api.js'
import Modal from '../components/Modal.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const ACTIONS = {
  kick: (p) => `kick ${p}`,
  ban: (p) => `ban ${p}`,
  pardon: (p) => `pardon ${p}`,
  op: (p) => `op ${p}`,
  deop: (p) => `deop ${p}`,
  whitelist_add: (p) => `whitelist add ${p}`,
  whitelist_remove: (p) => `whitelist remove ${p}`,
  gamemode_creative: (p) => `gamemode creative ${p}`,
  gamemode_survival: (p) => `gamemode survival ${p}`,
  kill_player: (p) => `kill ${p}`,
  heal: (p) => `effect give ${p} minecraft:instant_health 1 255`,
  feed: (p) => `effect give ${p} minecraft:saturation 1 255`,
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

function valueOrDash(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function formatHealth(value) {
  if (value === null || value === undefined || value === '') return '-'

  const n = Number(value)
  if (Number.isNaN(n)) return String(value)

  return `${Number.isInteger(n) ? n : n.toFixed(1)}/20`
}

function formatFood(value) {
  if (value === null || value === undefined || value === '') return '-'

  const n = Number(value)
  if (Number.isNaN(n)) return String(value)

  return `${Number.isInteger(n) ? n : n.toFixed(1)}/20`
}

function formatPosition(position) {
  if (!position || typeof position !== 'object') return '-'

  const x = position.x ?? '-'
  const y = position.y ?? '-'
  const z = position.z ?? '-'

  return `${x}, ${y}, ${z}`
}

export default function Players() {
  const toast = useToast()
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState('')
  const [extra, setExtra] = useState('')
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)

  const loadP = useCallback(async () => {
    setLoading(true)

    try {
      const data = await getJson('/api/players')

      const rows = Array.isArray(data.players)
        ? data.players.map(normalizePlayer).filter((p) => p.name)
        : []

      setPlayers(rows)
      setRaw(data.raw || '')
    } catch (e) {
      setPlayers([])
      setRaw('')
      toast(e.message, 'danger')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadP()
  }, [loadP])

  async function act(action) {
    if (!selected) return

    let cmd = ACTIONS[action] ? ACTIONS[action](selected) : `${action} ${selected}`

    if (extra && (action === 'kick' || action === 'ban')) {
      cmd += ` ${extra}`
    }

    try {
      const d = await postJson('/api/command', { command: cmd })
      toast(d.response || d.message || 'Command terkirim.', d.success ? 'success' : 'danger')
      await loadP()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <span className="text-muted">
            <i className="bi bi-people me-2" />
            Online Players
            <span className="badge bg-primary ms-2">{players.length}</span>
          </span>

          <button
            className="btn btn-sm btn-outline-secondary px-2 py-1"
            onClick={loadP}
            disabled={loading}
            title="Refresh players"
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} />
          </button>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Player Username</th>
                  <th>Dimension</th>
                  <th>Position</th>
                  <th>Health</th>
                  <th>Food</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th className="text-end">Management</th>
                </tr>
              </thead>

              <tbody>
                {players.length ? (
                  players.map((p) => (
                    <tr key={p.name}>
                      <td className="fw-medium">
                        <i className="bi bi-person-circle me-2 text-muted" />
                        {p.name}
                      </td>

                      <td>
                        <span className="badge bg-dark border border-secondary text-light fw-normal">
                          {valueOrDash(p.dimension)}
                        </span>
                      </td>

                      <td className="font-monospace small">
                        {formatPosition(p.position)}
                      </td>

                      <td>{formatHealth(p.health)}</td>
                      <td>{formatFood(p.food)}</td>
                      <td>{valueOrDash(p.level)}</td>

                      <td>
                        {p.valid ? (
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            Valid
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            Invalid
                          </span>
                        )}
                      </td>

                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setSelected(p.name)
                            setExtra('')
                          }}
                        >
                          Kelola
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4 small">
                      Tidak ada player online.
                      {raw ? (
                        <div className="font-monospace mt-2 opacity-75">{raw}</div>
                      ) : null}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected('')}
        title={
          <span>
            Kelola: <span className="text-primary">{selected}</span>
          </span>
        }
        size="modal-panel-sm"
      >
        <div className="p-4">
          <label className="form-label text-muted small fw-medium">
            Reason / Extra Parameter (Opsional)
          </label>

          <input
            className="form-control mb-4"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Contoh: Spamming/Cheating"
          />

          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('kick')}>
              Kick
            </button>

            <button className="btn btn-sm btn-outline-secondary text-danger border-danger" onClick={() => act('ban')}>
              Ban
            </button>

            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('pardon')}>
              Pardon
            </button>

            <div className="w-100 my-1 border-bottom" style={{ borderColor: 'var(--border)' }} />

            <button className="btn btn-sm btn-outline-primary" onClick={() => act('op')}>
              Set OP
            </button>

            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('deop')}>
              DeOP
            </button>

            <button className="btn btn-sm btn-outline-success" onClick={() => act('whitelist_add')}>
              Whitelist (+)
            </button>

            <button className="btn btn-sm btn-outline-secondary text-danger" onClick={() => act('whitelist_remove')}>
              Whitelist (-)
            </button>

            <div className="w-100 my-1 border-bottom" style={{ borderColor: 'var(--border)' }} />

            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('gamemode_creative')}>
              GMC
            </button>

            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('gamemode_survival')}>
              GMS
            </button>

            <button className="btn btn-sm btn-outline-success" onClick={() => act('heal')}>
              Heal
            </button>

            <button className="btn btn-sm btn-outline-secondary" onClick={() => act('feed')}>
              Feed
            </button>

            <button className="btn btn-sm btn-danger ms-auto" onClick={() => act('kill_player')}>
              <i className="bi bi-skull me-1" />
              Kill
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}