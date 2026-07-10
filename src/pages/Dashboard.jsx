import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getJson, postJson, wsUrl } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import SearchBar from '../components/SearchBar.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import StatCard from '../components/StatCard.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { clampPct, num } from '../utils/format.js'
import { classifyLog, normalizeLogEntry } from '../utils/logs.js'
import { formatHealth, formatFood, formatPosition, normalizePlayer, searchablePlayerText } from '../utils/players.js'

function normalizePlayers(data) {
  const source = Array.isArray(data?.players)
    ? data.players
    : Array.isArray(data?.names)
      ? data.names
      : []

  return source.map(normalizePlayer).filter((p) => p.name)
}

function statusNote(status) {
  if (!status) return 'Menunggu data backend.'
  if (String(status.status).toUpperCase() !== 'ONLINE') return 'Server belum online atau API tidak membaca proses server.'
  const tps = Number(status.tps)
  const mspt = Number(status.mspt)
  if (!Number.isNaN(tps) && tps < 18) return 'TPS sedang turun. Cek plugin berat, entity, atau chunk generation.'
  if (!Number.isNaN(mspt) && mspt > 50) return 'MSPT melewati 50 ms. Server mulai terbebani.'
  return 'Server online dan terbaca normal.'
}

function roleLabel(player) {
  const raw = String(player?.role || '').toLowerCase()
  if (raw.includes('owner') || raw.includes('admin') || raw.includes('operator') || raw === 'op') return 'Owner'
  if (player?.is_op || player?.op || player?.operator) return 'Owner'
  return 'Member'
}

function logTone(line) {
  const [type] = classifyLog(line)
  if (type === 'error') return 'border-red/70 text-[#e6b5b5]'
  if (type === 'warn') return 'border-yellow/70 text-[#e1c889]'
  if (type === 'join') return 'border-green/70 text-green'
  if (type === 'leave') return 'border-faint/70 text-faint'
  if (type === 'chat' || type === 'discord') return 'border-blue/70 text-[#d7e8ee] bg-white/[0.025]'
  return 'border-transparent text-dim'
}

function highlightLog(line) {
  const text = String(line || '')
  const chat = text.match(/^(.*?)(<)([A-Za-z0-9_]{1,16})(>)(.*)$/)
  if (chat) {
    return (
      <>
        <span className="text-faint">{chat[1]}{chat[2]}</span>
        <span className="rounded border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-dim2)] px-1 font-semibold text-[var(--accent-text)]">{chat[3]}</span>
        <span className="text-faint">{chat[4]}</span>
        <span className="text-textc">{chat[5]}</span>
      </>
    )
  }

  const joinLeave = text.match(/^(.*?:\s*)?([A-Za-z0-9_]{1,16})(\s+(?:joined|left) the game.*)$/i)
  const [type] = classifyLog(text)
  if (joinLeave && (type === 'join' || type === 'leave')) {
    return (
      <>
        <span className="text-faint">{joinLeave[1] || ''}</span>
        <span className="rounded border border-green/20 bg-green/10 px-1 font-semibold text-green">{joinLeave[2]}</span>
        <span>{joinLeave[3]}</span>
      </>
    )
  }

  return text
}

function RuntimeRow({ label, value, mono = false }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <span className="text-dim">{label}</span>
      <strong className={`min-w-0 truncate text-right font-medium text-textc ${mono ? 'font-mono' : ''}`}>{value || '--'}</strong>
    </div>
  )
}

function PlayerDropdown({ players }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? players.filter((p) => searchablePlayerText(p).includes(q)) : players
  }, [players, query])

  return (
    <details className="panel" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-soft px-3.5 py-2.5 marker:hidden">
        <div>
          <h3 className="panel-title">Players Online <span className="chip ml-1">{players.length}</span></h3>
          <p className="panel-subtitle">Dropdown informasi player + search</p>
        </div>
        <Icon name="users" className="h-4 w-4 text-faint" />
      </summary>

      <div className="space-y-3 p-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Cari player, world, posisi..." />

        {filtered.length ? (
          <div className="max-h-[360px] divide-y divide-soft overflow-auto rounded-panel border border-soft bg-raised">
            {filtered.map((p) => (
              <article key={p.name} className="flex min-w-0 items-center gap-2.5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate text-[12.5px] font-semibold text-textc">{p.name}</div>
                    <span className={`shrink-0 rounded py-0.5 font-mono text-[10px] ${roleLabel(p) === 'Owner' ? 'border-[#a970ff]/50 bg-[#a970ff]/10 text-[#caa7ff]' : 'border-green/40 bg-green/10 text-green'}`}>{roleLabel(p)}</span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-faint">{p.dimension || '-'} · {formatPosition(p.position)}</div>
                </div>
                <div className="hidden shrink-0 grid-cols-3 gap-1.5 text-center font-mono text-[10.5px] text-faint sm:grid">
                  <span>HP {formatHealth(p.health)}</span>
                  <span>Food {formatFood(p.food)}</span>
                  <span>Lv {p.level ?? '-'}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Tidak ada player" desc="Tidak ada player yang cocok dengan pencarian." />
        )}
      </div>
    </details>
  )
}

export default function Dashboard() {
  const toast = useToast()
  const conRef = useRef(null)
  const seenRef = useRef(new Set())
  const socketRef = useRef(null)
  const retryRef = useRef(null)
  const pingRef = useRef(null)

  const [status, setStatus] = useState(null)
  const [players, setPlayers] = useState([])
  const [logs, setLogs] = useState([])
  const [logQuery, setLogQuery] = useState('')
  const [logMode, setLogMode] = useState('all')
  const [cmd, setCmd] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [socketState, setSocketState] = useState('connecting')

  const fetchStatus = useCallback(async () => {
    try {
      setStatus(await getJson('/api/status'))
    } catch {
      setStatus((old) => ({ ...(old || {}), status: 'API OFFLINE' }))
    }
  }, [])

  const loadPlayers = useCallback(async () => {
    try {
      setPlayers(normalizePlayers(await getJson('/api/players')))
    } catch {
      setPlayers([])
    }
  }, [])

  const setBacklog = useCallback((arr) => {
    const normalized = (arr || []).map(normalizeLogEntry).filter((x) => x && x.line)
    seenRef.current = new Set(normalized.map((x) => x.id))
    setLogs(normalized.slice(-1600))
  }, [])

  const addEntry = useCallback((entry) => {
    if (!entry) return
    if (entry.type === 'log_history') {
      setBacklog(entry.logs || [])
      return
    }
    if (entry.type === 'log_line') {
      addEntry(entry.entry)
      return
    }
    if (entry.type === 'log_clear' || entry.type === 'clear') {
      seenRef.current.clear()
      setLogs([])
      return
    }
    if (entry.type === 'heartbeat' || entry.type === 'pong') return

    const normalized = normalizeLogEntry(entry)
    if (!normalized || !normalized.line) return
    if (seenRef.current.has(normalized.id)) return

    seenRef.current.add(normalized.id)
    setLogs((old) => {
      const next = [...old, normalized].slice(-1600)
      if (next.length >= 1600) seenRef.current = new Set(next.map((x) => x.id))
      return next
    })
  }, [setBacklog])

  useEffect(() => {
    fetchStatus()
    loadPlayers()
    const id = setInterval(() => {
      fetchStatus()
      loadPlayers()
    }, 5000)
    return () => clearInterval(id)
  }, [fetchStatus, loadPlayers])

  useEffect(() => {
    let alive = true
    getJson('/api/logs')
      .then((d) => { if (alive) setBacklog(d.logs || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [setBacklog])

  useEffect(() => {
    let manuallyClosed = false

    const connect = () => {
      const socket = new WebSocket(wsUrl('/ws/console'))
      socketRef.current = socket
      setSocketState('connecting')

      socket.onopen = () => {
        setSocketState('connected')
        if (pingRef.current) clearInterval(pingRef.current)
        pingRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send('ping')
        }, 20000)
      }

      socket.onmessage = (ev) => {
        try { addEntry(JSON.parse(ev.data)) } catch { addEntry(String(ev.data)) }
      }
      socket.onerror = () => setSocketState('error')
      socket.onclose = () => {
        if (pingRef.current) {
          clearInterval(pingRef.current)
          pingRef.current = null
        }
        if (manuallyClosed) return
        setSocketState('reconnecting')
        retryRef.current = setTimeout(connect, 1500)
      }
    }

    connect()

    return () => {
      manuallyClosed = true
      if (retryRef.current) clearTimeout(retryRef.current)
      if (pingRef.current) clearInterval(pingRef.current)
      const socket = socketRef.current
      if (socket && socket.readyState <= WebSocket.OPEN) socket.close()
    }
  }, [addEntry])

  useEffect(() => {
    if (autoScroll && conRef.current) conRef.current.scrollTop = conRef.current.scrollHeight
  }, [logs, autoScroll, logMode, logQuery])

  const visibleLogs = useMemo(() => {
    const q = logQuery.trim().toLowerCase()
    return logs.filter((item) => {
      const [, isChat, clean] = classifyLog(item.line)
      if (logMode === 'chat' && !isChat) return false
      if (logMode === 'warn' && !/(warn|error|exception)/i.test(clean)) return false
      if (q && !clean.toLowerCase().includes(q)) return false
      return true
    }).slice(-500)
  }, [logs, logMode, logQuery])

  async function sendCommand() {
    const command = cmd.trim()
    if (!command) return
    setCmd('')
    try {
      const result = await postJson('/api/command', { command })
      toast(result.response || result.message || 'Command dikirim.', result.success === false ? 'danger' : 'success')
    } catch (e) {
      toast(e.message || 'Gagal mengirim command.', 'danger')
    }
  }

  async function clearLog() {
    try {
      await postJson('/api/logs/clear')
    } finally {
      seenRef.current.clear()
      setLogs([])
    }
  }

  const st = status || {}
  const javaUsed = Number(st.java_ram?.used ?? st.java_ram_used ?? st.ram_used ?? 0)
  const javaMax = Number(st.java_ram?.max ?? st.java_ram_max ?? st.ram_max ?? 0)
  const javaPct = javaMax > 0 ? (javaUsed / javaMax) * 100 : st.java_ram_pct ?? st.ram_pct
  const onlinePlayers = players.length
  const maxPlayers = Number(st.max_players || st.maxPlayers || 0)
  const endpoint = `${st.server_ip || '--'}:${st.server_port || '--'}`

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="TPS" value={num(st.tps, '--', 1)} suffix="/20" pct={(Number(st.tps || 0) / 20) * 100} tone={Number(st.tps || 0) >= 18 ? 'good' : 'warn'} hint={`MSPT ${st.mspt || '--'}`} />
        <StatCard label="CPU" value={num(st.cpu_pct, '--', 0)} suffix="%" pct={clampPct(st.cpu_pct)} tone={Number(st.cpu_pct || 0) > 85 ? 'danger' : Number(st.cpu_pct || 0) > 65 ? 'warn' : undefined} />
        <StatCard label="RAM" value={num(st.ram_pct, '--', 0)} suffix="%" pct={clampPct(st.ram_pct)} tone={Number(st.ram_pct || 0) > 85 ? 'danger' : Number(st.ram_pct || 0) > 70 ? 'warn' : undefined} />
        <StatCard label="Java RAM" value={javaMax ? num(javaUsed, '--', 1) : num(st.java_ram, '--', 0)} suffix={javaMax ? `/${num(javaMax, '--', 1)}` : 'MB'} pct={clampPct(javaPct)} hint={javaMax ? 'GB heap' : 'Heap'} />
        <StatCard label="Players" value={onlinePlayers} suffix={maxPlayers ? `/${maxPlayers}` : ''} pct={maxPlayers ? (onlinePlayers / maxPlayers) * 100 : undefined} />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
        <div className="space-y-3">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3 className="panel-title">Console <span className="chip ml-1">live</span></h3>
                <p className="panel-subtitle">Log server digabung ke Dashboard agar monitoring lebih cepat.</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button className="btn btn-sm" onClick={() => setAutoScroll((v) => !v)}>{autoScroll ? 'Auto' : 'Manual'}</button>
                <button className="btn btn-sm" onClick={clearLog}><Icon name="trash" className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b border-soft p-3 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
              <SearchBar value={logQuery} onChange={setLogQuery} placeholder="Search log..." />
              <SelectMenu
                value={logMode}
                onChange={setLogMode}
                options={[
                  { value: 'all', label: 'All logs' },
                  { value: 'chat', label: 'Chat/player' },
                  { value: 'warn', label: 'Warn/error' },
                ]}
              />
              <span className={`inline-flex items-center justify-center rounded-panel border border-borderc bg-raised px-2.5 py-1.5 font-mono text-[11px] ${socketState === 'connected' ? 'text-green' : socketState === 'error' ? 'text-red' : 'text-yellow'}`}>
                {socketState}
              </span>
            </div>

            <div ref={conRef} className="h-[390px] overflow-auto bg-[#0a0a0a] p-3 font-mono text-[12px] leading-7 sm:h-[430px]">
              {visibleLogs.map((item, index) => (
                <div key={item.id || index} className={`border-l-2 px-2 whitespace-pre-wrap break-words ${logTone(item.line)}`}>
                  {highlightLog(item.line)}
                </div>
              ))}
              {!visibleLogs.length ? <div className="py-10 text-center text-faint">Belum ada log yang cocok.</div> : null}
            </div>

            <div className="flex items-center gap-2 border-t border-soft bg-panel px-3.5 py-2.5">
              <span className="font-mono text-[var(--accent-text)]">&gt;</span>
              <input
                className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-textc outline-none placeholder:text-faint"
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendCommand() } }}
                placeholder="ketik command server lalu Enter..."
              />
              <button className="btn btn-sm btn-accent" onClick={sendCommand}>Send</button>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3 className="panel-title">Server Information</h3>
                <p className="panel-subtitle">{statusNote(st)}</p>
              </div>
            </div>
            <div className="divide-y divide-soft px-3.5 py-1">
              <RuntimeRow label="Status" value={st.status} />
              <RuntimeRow label="Minecraft" value={st.mc_ver || st.paper_ver} />
              <RuntimeRow label="Software" value={st.paper_ver} />
              <RuntimeRow label="Java" value={st.java_ver} />
              <RuntimeRow label="Endpoint" value={endpoint} mono />
              <RuntimeRow label="Disk" value={st.disk_used} />
              <RuntimeRow label="Uptime" value={st.uptime} />
            </div>
          </div>

          <PlayerDropdown players={players} />
        </aside>
      </section>
    </div>
  )
}