import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import Modal from '../components/Modal.jsx'
import SearchBar from '../components/SearchBar.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { formatFood, formatHealth, formatPosition, normalizePlayer, searchablePlayerText, sortPlayers } from '../utils/players.js'

function normalizeRows(data) {
  const source = Array.isArray(data?.players)
    ? data.players
    : Array.isArray(data?.names)
      ? data.names
      : []
  return source.map(normalizePlayer).filter((p) => p.name)
}

function roleLabel(player) {
  const raw = String(player?.role || '').toLowerCase()
  if (raw.includes('owner') || raw.includes('admin') || raw.includes('operator') || raw === 'op') return 'Owner'
  if (player?.is_op || player?.op || player?.operator) return 'Owner'
  return 'Member'
}

function roleClass(player) {
  return roleLabel(player) === 'Owner'
    ? 'border-[#a970ff]/50 bg-[#a970ff]/10 text-[#caa7ff]'
    : 'border-green/40 bg-green/10 text-green'
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-panel border border-soft bg-panel px-2 py-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-faint">{label}</div>
      <div className="mt-0.5 truncate font-mono text-[12px] text-textc">{value || '-'}</div>
    </div>
  )
}

export default function Players() {
  const toast = useToast()
  const [players, setPlayers] = useState([])
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const loadPlayers = useCallback(async () => {
    setLoading(true)
    try {
      setPlayers(normalizeRows(await getJson('/api/players')))
    } catch (e) {
      toast(e.message || 'Gagal memuat players', 'danger')
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
    const q = query.trim().toLowerCase()
    const data = q ? players.filter((p) => searchablePlayerText(p).includes(q)) : players
    return sortPlayers(data, sortBy)
  }, [players, query, sortBy])

  async function runCommand(player, command, label = command) {
    if (!player?.name) return
    const key = `${player.name}:${label}`
    setBusy(key)
    try {
      const result = await postJson('/api/command', { command: command.replaceAll('{player}', player.name) })
      toast(result.response || result.message || `${label} dikirim`, result.success === false ? 'danger' : 'success')
      setTimeout(loadPlayers, 800)
    } catch (e) {
      toast(e.message || `${label} gagal`, 'danger')
    } finally {
      setBusy('')
    }
  }

  function confirmRun(player, question, command, label) {
    if (!window.confirm(question)) return
    runCommand(player, command, label)
  }

  const quickActions = [
    ['Heal', 'heal {player}'],
    ['Feed', 'feed {player}'],
    ['Survival', 'gamemode survival {player}'],
    ['Creative', 'gamemode creative {player}'],
  ]

  const moreActions = [
    ['Kill', 'kill {player}', true],
    ['Kick', 'kick {player}', true],
    ['OP', 'op {player}', false],
    ['DeOP', 'deop {player}', false],
    ['Ban', 'ban {player}', true],
    ['Pardon', 'pardon {player}', false],
    ['Whitelist Add', 'whitelist add {player}', false],
    ['Whitelist Remove', 'whitelist remove {player}', false],
  ]

  return (
    <div className="space-y-3">
      <section className="panel">
        <div className="flex flex-col gap-3 border-b border-soft p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-textc">Players</h2>
            <p className="mt-0.5 text-xs text-faint">{players.length} online · {filtered.length} ditampilkan · update otomatis</p>
          </div>
          <button className="btn btn-sm shrink-0" onClick={loadPlayers} disabled={loading}>
            <Icon name="refresh" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 border-b border-soft p-3 sm:grid-cols-[minmax(0,1fr)_170px]">
          <SearchBar value={query} onChange={setQuery} placeholder="Search nama, role, world, posisi..." />
          <SelectMenu
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'name', label: 'Sort: Name' },
              { value: 'role', label: 'Sort: Role' },
              { value: 'dimension', label: 'Sort: World' },
              { value: 'health', label: 'Sort: Health' },
              { value: 'level', label: 'Sort: Level' },
              { value: 'status', label: 'Sort: Status' },
            ]}
          />
        </div>
      </section>

      {filtered.length ? (
        <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((p) => {
            const role = roleLabel(p)
            return (
              <article key={p.name} className="rounded-panel border border-soft bg-panel p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-textc" title={p.name}>{p.name}</h3>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${roleClass(p)}`}>{role}</span>
                    </div>

                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-faint">
                      <span className="inline-flex items-center gap-1 text-green"><span className="h-1.5 w-1.5 rounded-full bg-green" />Online</span>
                      <span className="truncate">{p.dimension || '-'}</span>
                      <span className="truncate">{p.ping ? `${p.ping}ms` : 'ping --'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 truncate rounded-panel border border-soft bg-raised px-2.5 py-2 font-mono text-[11px] text-faint" title={formatPosition(p.position)}>
                  Posisi: <span className="text-textc">{formatPosition(p.position)}</span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <MiniMetric label="HP" value={formatHealth(p.health)} />
                  <MiniMetric label="Food" value={formatFood(p.food)} />
                  <MiniMetric label="Level" value={p.level ?? '-'} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                  {quickActions.map(([label, command]) => (
                    <button
                      key={label}
                      className="btn btn-sm min-w-0 px-2"
                      disabled={busy === `${p.name}:${label}`}
                      onClick={() => runCommand(p, command, label)}
                    >
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                  <button
                    className="btn btn-sm btn-danger min-w-0 px-2"
                    disabled={busy === `${p.name}:Kick`}
                    onClick={() => confirmRun(p, `Kick ${p.name}?`, 'kick {player}', 'Kick')}
                  >
                    Kick
                  </button>
                  <button className="btn btn-sm min-w-0 px-2" onClick={() => setSelected(p)}>More</button>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <section className="panel">
          <EmptyState title="Tidak ada player" desc="Tidak ada player online atau tidak ada hasil yang cocok dengan pencarian." />
        </section>
      )}

      {selected ? (
        <Modal title={`Kelola ${selected.name}`} onClose={() => setSelected(null)}>
          <div className="mb-3 rounded-panel border border-soft bg-raised p-3 text-sm text-dim">
            <div className="truncate"><b className="text-textc">World:</b> {selected.dimension || '-'}</div>
            <div className="truncate"><b className="text-textc">Position:</b> {formatPosition(selected.position)}</div>
            <div><b className="text-textc">Health:</b> {formatHealth(selected.health)} · <b className="text-textc">Food:</b> {formatFood(selected.food)} · <b className="text-textc">Level:</b> {selected.level ?? '-'}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {moreActions.map(([label, command, dangerous]) => (
              <button
                key={label}
                className={`btn btn-sm ${dangerous ? 'btn-danger' : ''}`}
                disabled={busy === `${selected.name}:${label}`}
                onClick={() => dangerous ? confirmRun(selected, `${label} ${selected.name}?`, command, label) : runCommand(selected, command, label)}
              >
                {label}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
