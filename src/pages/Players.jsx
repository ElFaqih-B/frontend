import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatPosition, normalizePlayer } from '../utils/players.js'

function getRole(player) {
  const raw = String(
    player?.role ||
      player?.rank ||
      player?.group ||
      player?.primary_group ||
      player?.permission_group ||
      ''
  ).toLowerCase()

  if (player?.is_op || player?.op || player?.operator) return 'Owner'

  if (
    raw.includes('owner') ||
    raw.includes('admin') ||
    raw.includes('operator') ||
    raw === 'op'
  ) {
    return 'Owner'
  }

  return 'Member'
}

function roleClass(player) {
  return getRole(player) === 'Owner' ? 'role-owner' : 'role-member'
}

function val(value) {
  if (value === null || value === undefined || value === '') return '--'
  return value
}

function intVal(value) {
  if (value === null || value === undefined || value === '') return '--'
  const n = Number(value)
  if (Number.isNaN(n)) return '--'
  return Math.round(n)
}

function normalizeRows(data) {
  const source = Array.isArray(data.players)
    ? data.players
    : Array.isArray(data.names)
      ? data.names
      : []

  return source
    .map(normalizePlayer)
    .filter((p) => p.name)
    .map((p) => ({
      ...p,
      role: getRole(p),
      status: 'Online',
    }))
}

function comparePlayer(a, b, key) {
  if (key === 'role') {
    const order = { Owner: 0, Member: 1 }
    return (order[a.role] ?? 99) - (order[b.role] ?? 99)
  }

  if (key === 'health' || key === 'food' || key === 'level') {
    return Number(a[key] ?? -1) - Number(b[key] ?? -1)
  }

  if (key === 'position') {
    return formatPosition(a.position).localeCompare(formatPosition(b.position))
  }

  return String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
}

export default function Players() {
  const toast = useToast()

  const [players, setPlayers] = useState([])
  const [raw, setRaw] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('role')
  const [sortDir, setSortDir] = useState('asc')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const loadPlayers = useCallback(async () => {
    try {
      const data = await getJson('/api/players')
      setPlayers(normalizeRows(data))
      setRaw(data.raw || '')
    } catch (e) {
      toast(e.message || 'Gagal mengambil data player.', 'danger')
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadPlayers()

    const id = setInterval(loadPlayers, 5000)
    return () => clearInterval(id)
  }, [loadPlayers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    let rows = [...players]

    if (q) {
      rows = rows.filter((p) => {
        const haystack = [
          p.name,
          p.role,
          p.status,
          p.dimension,
          formatPosition(p.position),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(q)
      })
    }

    rows.sort((a, b) => {
      const result = comparePlayer(a, b, sortBy)
      return sortDir === 'asc' ? result : -result
    })

    return rows
  }, [players, search, sortBy, sortDir])

  async function runCommand(command, message) {
    setBusy(command)

    try {
      const result = await postJson('/api/command', { command })
      toast(
        result.message || result.response || result.output || message || 'Command dikirim.',
        result.success === false ? 'danger' : 'success'
      )

      setTimeout(loadPlayers, 700)
    } catch (e) {
      toast(e.message || 'Gagal menjalankan command.', 'danger')
    } finally {
      setBusy('')
    }
  }

  function confirmCommand(question, command, message) {
    if (!window.confirm(question)) return
    runCommand(command, message)
  }

  return (
    <div className="players-page">
      <div className="panel-card mb-3">
        <div className="panel-head compact">
          <div>
            <h3>Players</h3>
            <p>{players.length} online</p>
          </div>

          <button className="btn btn-sm btn-soft" onClick={loadPlayers} disabled={loading}>
            <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'} me-1`} />
            Refresh
          </button>
        </div>

        <div className="row g-2 align-items-center">
          <div className="col-12 col-lg">
            <div className="searchbar-wrap">
              <i className="bi bi-search text-muted" />
              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari player, role, dimension, position..."
              />

              {search && (
                <button className="btn btn-sm btn-soft" onClick={() => setSearch('')}>
                  <i className="bi bi-x-lg" />
                </button>
              )}
            </div>
          </div>

          <div className="col-6 col-lg-auto">
            <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="role">Sort: Role</option>
              <option value="name">Sort: Name</option>
              <option value="dimension">Sort: Dimension</option>
              <option value="position">Sort: Position</option>
              <option value="health">Sort: Health</option>
              <option value="food">Sort: Food</option>
              <option value="level">Sort: Level</option>
            </select>
          </div>

          <div className="col-6 col-lg-auto">
            <button
              className="btn btn-soft w-100"
              onClick={() => setSortDir((v) => (v === 'asc' ? 'desc' : 'asc'))}
            >
              <i className={`bi ${sortDir === 'asc' ? 'bi-sort-down' : 'bi-sort-up'} me-1`} />
              {sortDir === 'asc' ? 'Asc' : 'Desc'}
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-responsive">
          <table className="table align-middle mb-0 players-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>Status</th>
                <th>Dimension</th>
                <th>Position</th>
                <th>Health</th>
                <th>Food</th>
                <th>Level</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => (
                <tr key={p.name}>
                  <td>
                    <div className="player-name-only">{p.name}</div>
                    <div className="player-mobile-meta">
                      {val(p.dimension)} · {formatPosition(p.position)}
                    </div>
                  </td>

                  <td>
                    <span className={`role-chip ${roleClass(p)}`}>
                      {p.role}
                    </span>
                  </td>

                  <td>
                    <span className="online-chip">
                      <span className="status-dot good" />
                      Online
                    </span>
                  </td>

                  <td className="hide-sm">{val(p.dimension)}</td>
                  <td className="font-monospace text-muted hide-md">{formatPosition(p.position)}</td>
                  <td className="font-monospace">{intVal(p.health)}</td>
                  <td className="font-monospace hide-sm">{intVal(p.food)}</td>
                  <td className="font-monospace hide-sm">{intVal(p.level)}</td>

                  <td className="text-end">
                    <div className="player-actions">
                      <button
                        className="btn btn-sm btn-soft"
                        disabled={!!busy}
                        title="Heal"
                        onClick={() => runCommand(`effect give ${p.name} minecraft:instant_health 1 10 true`, `${p.name} di-heal.`)}
                      >
                        <i className="bi bi-heart-pulse" />
                        <span>Heal</span>
                      </button>

                      <button
                        className="btn btn-sm btn-soft"
                        disabled={!!busy}
                        title="Feed"
                        onClick={() => runCommand(`effect give ${p.name} minecraft:saturation 5 5 true`, `${p.name} diberi saturation.`)}
                      >
                        <i className="bi bi-egg-fried" />
                        <span>Feed</span>
                      </button>

                      <button
                        className="btn btn-sm btn-soft"
                        disabled={!!busy}
                        title="Survival"
                        onClick={() => runCommand(`gamemode survival ${p.name}`, `${p.name} ke survival.`)}
                      >
                        <i className="bi bi-tree" />
                        <span>Surv</span>
                      </button>

                      <button
                        className="btn btn-sm btn-soft"
                        disabled={!!busy}
                        title="Creative"
                        onClick={() => runCommand(`gamemode creative ${p.name}`, `${p.name} ke creative.`)}
                      >
                        <i className="bi bi-hammer" />
                        <span>Creat</span>
                      </button>

                      <button
                        className="btn btn-sm btn-soft text-danger"
                        disabled={!!busy}
                        title="Kick"
                        onClick={() => confirmCommand(`Kick ${p.name}?`, `kick ${p.name}`, `${p.name} dikick.`)}
                      >
                        <i className="bi bi-box-arrow-right" />
                        <span>Kick</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-5">
                    Tidak ada player online / tidak ada hasil pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {raw && (
        <details className="panel-card mt-3">
          <summary className="text-muted small">Raw player output</summary>
          <pre className="small font-monospace text-muted mt-2 mb-0 overflow-auto">{raw}</pre>
        </details>
      )}
    </div>
  )
}