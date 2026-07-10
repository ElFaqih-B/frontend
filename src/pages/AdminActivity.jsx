import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import EmptyState from '../components/EmptyState.jsx'
import Icon from '../components/Icons.jsx'
import PageHeader from '../components/PageHeader.jsx'
import SearchBar from '../components/SearchBar.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import { fmtTime } from '../utils/format.js'

const AUDIT_FETCH_LIMIT = 500
const AUDIT_DISPLAY_LIMIT = 12

function riskLevel(action = '', target = '') {
  const a = String(action).toUpperCase()
  const t = String(target).toLowerCase()
  if (a.includes('LOGIN_FAILED')) return 'blocked'
  if (a.includes('REVOKE')) return 'high'
  if (t.includes('/kill') || t.includes('/settings') || t.includes('/plugins') || t.includes('/files')) return 'critical'
  if (t.includes('/restart') || t.includes('/stop') || t.includes('/backups')) return 'high'
  if (t.includes('/command') || t.includes('/players')) return 'medium'
  return 'low'
}

function riskClass(level) {
  if (level === 'critical') return 'border-red text-red bg-red/10'
  if (level === 'high') return 'border-yellow text-yellow bg-yellow/10'
  if (level === 'medium') return 'border-blue text-blue bg-blue/10'
  if (level === 'blocked') return 'border-red text-red bg-red/10'
  return 'border-green text-green bg-green/10'
}

function formatAuditTarget(item) {
  const action = String(item?.action || '').toUpperCase()
  const target = String(item?.target || '')
  const t = target.toLowerCase()
  if (action === 'LOGIN_SUCCESS') return 'Login berhasil'
  if (action === 'LOGIN_FAILED') return 'Login gagal'
  if (action === 'LOGOUT') return 'Logout dari dashboard'
  if (action === 'REVOKE_SESSION') return 'Mencabut session admin'
  if (t === '/api/start') return 'Memulai server'
  if (t === '/api/stop') return 'Menghentikan server'
  if (t === '/api/restart') return 'Restart server'
  if (t === '/api/kill') return 'Mematikan paksa proses Java'
  if (t.includes('/api/command')) return 'Menjalankan command console'
  if (t.includes('/api/plugins/upload')) return 'Menambahkan plugin'
  if (t.includes('/api/plugins/delete') || t.includes('/api/plugin/delete')) return 'Menghapus plugin'
  if (t.includes('/api/files/write')) return 'Mengedit file server'
  if (t.includes('/api/files/upload')) return 'Mengupload file server'
  if (t.includes('/api/files/delete')) return 'Menghapus file server'
  if (t.includes('/api/backups/create') || t.includes('/api/backup/create')) return 'Membuat backup'
  if (t.includes('/api/backups/restore') || t.includes('/api/backup/restore')) return 'Restore backup'
  if (t.includes('/api/world')) return 'Mengatur world server'
  if (t.includes('/api/auth/audit')) return 'Membuka Admin Activity'
  if (t.includes('/api/auth/sessions')) return 'Melihat session admin'
  return target || action || '--'
}

function shortHash(value) {
  return value ? `${String(value).slice(0, 10)}...` : '--'
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-panel border px-3 py-2 text-sm font-semibold transition ${active ? 'border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-dim2)] text-[var(--accent-text)]' : 'border-borderc bg-panel text-dim hover:bg-hover hover:text-textc'}`}
    >
      {children}
    </button>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-panel border border-soft bg-raised p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.06em] text-faint">{label}</div>
      <div className="mt-1 text-xl font-bold text-textc">{value ?? '--'}</div>
      <div className="text-[11px] text-faint">{hint}</div>
    </div>
  )
}

export default function AdminActivity() {
  const toast = useToast()
  const { user } = useAuth()

  const [tab, setTab] = useState('summary')
  const [summary, setSummary] = useState({})
  const [logs, setLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [query, setQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [busy, setBusy] = useState('')

  const isOwner = user?.role === 'owner'

  const loadData = useCallback(async () => {
    try {
      const [summaryData, auditData, sessionData] = await Promise.all([
        getJson('/api/auth/audit/summary'),
        getJson(`/api/auth/audit?limit=${AUDIT_FETCH_LIMIT}`),
        getJson('/api/auth/sessions'),
      ])
      setSummary(summaryData.summary || {})
      setLogs(Array.isArray(auditData.logs) ? auditData.logs : [])
      setSessions(Array.isArray(sessionData.sessions) ? sessionData.sessions : [])
    } catch (e) {
      toast(e.message || 'Gagal memuat Admin Activity.', 'danger')
    }
  }, [toast])

  useEffect(() => {
    if (isOwner) loadData()
  }, [isOwner, loadData])

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter((item) => {
      const level = riskLevel(item.action, item.target)
      if (filterRisk !== 'all' && level !== filterRisk) return false
      if (!q) return true
      return [item.username, item.action, item.target, formatAuditTarget(item), item.ip, item.created_at].join(' ').toLowerCase().includes(q)
    })
  }, [logs, query, filterRisk])

  const visibleLogs = filteredLogs.slice(0, AUDIT_DISPLAY_LIMIT)

  async function revokeSession(tokenHash, username) {
    if (!window.confirm(`Revoke session milik ${username}?`)) return
    setBusy(tokenHash)
    try {
      const data = await postJson('/api/auth/sessions/revoke', { token_hash: tokenHash })
      toast(data.message || 'Session direvoke.', data.success === false ? 'danger' : 'success')
      if (data.success !== false) loadData()
    } catch (e) {
      toast(e.message || 'Gagal revoke session.', 'danger')
    } finally {
      setBusy('')
    }
  }

  if (!isOwner) {
    return (
      <section className="panel-pad">
        <h3 className="text-base font-semibold text-textc">Admin Activity</h3>
        <p className="mt-1 text-sm text-dim">Halaman ini hanya bisa diakses owner. Role akunmu: <b>{user?.role || 'unknown'}</b>.</p>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <PageHeader eyebrow="System Monitor" title="Admin Activity" desc="Dipisah menjadi sub-pages agar log, session, dan ringkasan tidak saling menumpuk." actions={<button className="btn" onClick={loadData}><Icon name="refresh" className="h-3.5 w-3.5" />Refresh</button>} />

      <nav className="flex flex-wrap gap-2">
        <TabButton active={tab === 'summary'} onClick={() => setTab('summary')}>Summary</TabButton>
        <TabButton active={tab === 'logs'} onClick={() => setTab('logs')}>Audit logs</TabButton>
        <TabButton active={tab === 'sessions'} onClick={() => setTab('sessions')}>Active sessions</TabButton>
      </nav>

      {tab === 'summary' ? (
        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Actions" value={summary.total_actions} hint="Log terbaru" />
          <Stat label="Admins" value={summary.active_admins} hint="Aktif" />
          <Stat label="Commands" value={summary.commands} hint="Console/API" />
          <Stat label="Server" value={summary.server_actions} hint="Start/restart" />
          <Stat label="Files" value={summary.file_actions} hint="File access" />
          <Stat label="Failed" value={summary.failed_login} hint="Login gagal" />
        </section>
      ) : null}

      {tab === 'logs' ? (
        <section className="panel overflow-visible">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Audit Logs</h3>
              <p className="panel-subtitle">Menampilkan {visibleLogs.length} dari {filteredLogs.length} hasil. Search tetap mengambil dari {logs.length} log terbaru.</p>
            </div>
          </div>

          <div className="grid gap-2 border-b border-soft p-3 sm:grid-cols-[1fr_170px]">
            <SearchBar value={query} onChange={setQuery} placeholder="Search admin, action, IP..." />
            <SelectMenu
              value={filterRisk}
              onChange={setFilterRisk}
              options={[
                { value: 'all', label: 'All Risk' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
                { value: 'blocked', label: 'Blocked' },
              ]}
            />
          </div>

          {visibleLogs.length ? (
            <div className="divide-y divide-soft">
              {visibleLogs.map((item, index) => {
                const level = riskLevel(item.action, item.target)
                return (
                  <article key={`${item.created_at}-${index}`} className="grid grid-cols-1 gap-1 px-3.5 py-3 md:grid-cols-[128px_120px_90px_1fr_160px] md:items-center">
                    <div className="font-mono text-xs text-faint">{fmtTime(item.created_at)}</div>
                    <div className="truncate text-sm font-semibold text-textc">{item.username || '--'}</div>
                    <span className={`w-fit rounded border px-2 py-0.5 font-mono text-[10px] ${riskClass(level)}`}>{level}</span>
                    <div className="min-w-0 truncate text-sm text-dim" title={item.target || ''}>{formatAuditTarget(item)}</div>
                    <div className="truncate font-mono text-xs text-faint" title={item.ip || ''}>{item.ip || '--'}</div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState title="Tidak ada audit log" desc="Tidak ada hasil untuk filter ini." />
          )}
        </section>
      ) : null}

      {tab === 'sessions' ? (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3 className="panel-title">Active Sessions</h3>
              <p className="panel-subtitle">{sessions.length} session aktif. Layout dibuat grid agar user-agent tidak memotong card.</p>
            </div>
          </div>

          {sessions.length ? (
            <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <article className="min-w-0 rounded-panel border border-soft bg-raised p-3" key={session.token_hash}>
                  <div className="flex min-w-0 justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-textc">{session.username}</div>
                      <div className="font-mono text-xs capitalize text-faint">{session.role}</div>
                    </div>
                    <div className="shrink-0 font-mono text-xs text-faint">{shortHash(session.token_hash)}</div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-dim">
                    <div className="grid grid-cols-[70px_1fr] gap-2"><span>IP</span><b className="min-w-0 truncate font-mono text-textc" title={session.ip || ''}>{session.ip || '--'}</b></div>
                    <div className="grid grid-cols-[70px_1fr] gap-2"><span>Last</span><b className="min-w-0 truncate font-mono text-textc">{fmtTime(session.last_seen_at)}</b></div>
                  </div>

                  <div className="mt-3 max-h-16 overflow-auto rounded-panel border border-borderc bg-panel p-2 font-mono text-[11px] leading-5 text-faint" title={session.user_agent || ''}>{session.user_agent || 'Unknown device'}</div>

                  <button className="btn btn-sm btn-danger mt-3 w-full" disabled={busy === session.token_hash} onClick={() => revokeSession(session.token_hash, session.username)}>
                    {busy === session.token_hash ? 'Revoking...' : 'Revoke session'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Tidak ada session" desc="Tidak ada session aktif." />
          )}
        </section>
      ) : null}
    </div>
  )
}
