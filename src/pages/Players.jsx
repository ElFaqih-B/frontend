import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Modal from '../components/Modal.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import {
  formatFood,
  formatHealth,
  formatPosition,
  normalizePlayer,
  searchablePlayerText,
  sortPlayers,
} from '../utils/players.js'

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

function RoleBadge({ role }) {
  const text = String(role || 'Member')
  const lower = text.toLowerCase()
  let cls = 'role-member'

  if (lower.includes('owner') || lower.includes('admin') || lower.includes('op')) cls = 'role-admin'
  else if (lower.includes('mod') || lower.includes('staff')) cls = 'role-staff'

  return <span className={`role-badge ${cls}`}>{text}</span>
}

export default function Players() {
  const toast = useToast()
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState(null)
  const [extra, setExtra] = useState('')
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadPlayers = useCallback(async () => {
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
    loadPlayers()
  }, [loadPlayers])

  const filteredPlayers = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = players.filter((p) => {
      if (statusFilter === 'valid' && !p.valid) return false
      if (statusFilter === 'invalid' && p.valid) return false
      if (!q) return true
      return searchablePlayerText(p).includes(q)
    })

    return sortPlayers(filtered, sortBy)
  }, [players, query, sortBy, statusFilter])

  async function act(action) {
    if (!selected?.name) return

    let cmd = ACTIONS[action] ? ACTIONS[action](selected.name) : `${action} ${selected.name}`
    if (extra && (action === 'kick' || action === 'ban')) cmd += ` ${extra}`

    try {
      const data = await postJson('/api/command', { command: cmd })
      toast(data.response || data.message || 'Command terkirim.', data.success ? 'success' : 'danger')
      await loadPlayers()
    } catch (e) {
      toast(e.message, 'danger')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Players"
        title="Online players"
        description="Cari, urutkan, dan cek role pemain yang sedang online."
        actions={(
          <button className="btn btn-soft" onClick={loadPlayers} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        )}
      />

      <div className="panel-card">
        <div className="table-toolbar">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Cari player, role, world, koordinat..."
            className="flex-grow-1"
          />

          <select className="form-select control-compact" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>

          <select className="form-select control-compact" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Nama</option>
            <option value="role">Role</option>
            <option value="dimension">World</option>
            <option value="health">Health</option>
            <option value="level">Level</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="panel-subline">
          <span>{filteredPlayers.length} dari {players.length} player</span>
          {raw ? <span className="font-monospace text-truncate" title={raw}>RCON: {raw}</span> : null}
        </div>

        <div className="table-responsive">
          <table className="table modern-table align-middle mb-0">
            <thead>
              <tr>
                <th>Player</th>
                <th>Role</th>
                <th>World</th>
                <th>Position</th>
                <th>Health</th>
                <th>Food</th>
                <th>Level</th>
                <th>Status</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredPlayers.length ? (
                filteredPlayers.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <div className="player-cell">
                        <div className="player-name">{p.name}</div>
                        <div className="table-muted">{p.ping ? `${p.ping}ms` : 'online'}</div>
                      </div>
                    </td>
                    <td><RoleBadge role={p.role} /></td>
                    <td>{p.dimension || '-'}</td>
                    <td className="font-monospace small">{formatPosition(p.position)}</td>
                    <td>{formatHealth(p.health)}</td>
                    <td>{formatFood(p.food)}</td>
                    <td>{p.level ?? '-'}</td>
                    <td>
                      <span className={`state-pill ${p.valid ? 'ok' : 'warn'}`}>{p.valid ? 'Valid' : 'Invalid'}</span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-soft" onClick={() => { setSelected(p); setExtra('') }}>
                        Kelola
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">
                    <EmptyState
                      title={players.length ? 'Tidak ada hasil cocok' : 'Tidak ada player online'}
                      description={players.length ? 'Ubah kata kunci, filter, atau sort.' : 'Data muncul setelah /api/players mengembalikan player online.'}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? <span>Kelola: <span className="text-primary">{selected.name}</span></span> : 'Kelola Player'}
        size="modal-panel-sm"
      >
        <div className="p-4">
          {selected ? (
            <div className="selected-player-card mb-4">
              <div>
                <div className="fw-semibold text-light">{selected.name}</div>
                <div className="text-muted small">{selected.role || 'Member'} · {selected.dimension || 'Unknown world'}</div>
              </div>
            </div>
          ) : null}

          <label className="form-label text-muted small fw-medium">Reason / Extra Parameter</label>
          <input
            className="form-control mb-4"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Contoh: Spamming/Cheating"
          />

          <div className="action-grid">
            <button className="btn btn-sm btn-soft" onClick={() => act('kick')}>Kick</button>
            <button className="btn btn-sm btn-soft text-danger" onClick={() => act('ban')}>Ban</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('pardon')}>Pardon</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('op')}>Set OP</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('deop')}>DeOP</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('whitelist_add')}>Whitelist +</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('whitelist_remove')}>Whitelist -</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('gamemode_creative')}>GMC</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('gamemode_survival')}>GMS</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('heal')}>Heal</button>
            <button className="btn btn-sm btn-soft" onClick={() => act('feed')}>Feed</button>
            <button className="btn btn-sm btn-danger" onClick={() => act('kill_player')}>Kill</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
