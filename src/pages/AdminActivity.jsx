import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../api.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'

const AUDIT_FETCH_LIMIT = 500
const AUDIT_DISPLAY_LIMIT = 10
const SESSION_DISPLAY_LIMIT = 4

function fmtTime(value) {
  if (!value) return '--'

  try {
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function riskLevel(action = '', target = '') {
  const a = String(action).toUpperCase()
  const t = String(target).toLowerCase()

  if (a.includes('LOGIN_FAILED')) return 'blocked'
  if (a.includes('REVOKE')) return 'high'
  if (t.includes('/kill') || t.includes('/settings') || t.includes('/plugins') || t.includes('/files')) return 'critical'
  if (t.includes('/restart') || t.includes('/stop') || t.includes('/backups')) return 'high'
  if (t.includes('/command') || t.includes('/players')) return 'medium'
  if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'low'

  return 'low'
}

function riskLabel(level) {
  if (level === 'critical') return 'Critical'
  if (level === 'high') return 'High'
  if (level === 'medium') return 'Medium'
  if (level === 'blocked') return 'Blocked'
  return 'Low'
}

function shortHash(value) {
  if (!value) return '--'
  return `${value.slice(0, 10)}...`
}

function compactText(value) {
  if (!value) return '--'
  return String(value)
}

function formatAuditTarget(item) {
  const action = String(item?.action || '').toUpperCase()
  const target = String(item?.target || '')

  const t = target.toLowerCase()

  if (action === 'LOGIN_SUCCESS') return 'Login berhasil'
  if (action === 'LOGIN_FAILED') return 'Login gagal'
  if (action === 'LOGOUT') return 'Logout dari dashboard'
  if (action === 'CHANGE_PASSWORD') return 'Mengganti password'
  if (action === 'REVOKE_SESSION') {
    const username = target.startsWith('session:') ? target.replace('session:', '') : ''
    return username ? `Mencabut session ${username}` : 'Mencabut session admin'
  }

  if (t === '/api/start') return 'Memulai server'
  if (t === '/api/stop') return 'Menghentikan server'
  if (t === '/api/restart') return 'Restart server'
  if (t === '/api/kill') return 'Mematikan paksa proses Java'

  if (t === '/api/status') return 'Melihat status server'
  if (t === '/api/players') return 'Melihat daftar player'
  if (t === '/api/worlds') return 'Melihat daftar world'
  if (t === '/api/plugins') return 'Melihat daftar plugin'
  if (t === '/api/files') return 'Membuka file manager'
  if (t === '/api/backups') return 'Melihat daftar backup'
  if (t === '/api/settings') return 'Membuka settings'

  if (t.includes('/api/command')) return 'Menjalankan command console'

  if (t.includes('/api/plugins/upload')) return 'Menambahkan plugin'
  if (t.includes('/api/plugins/delete')) return 'Menghapus plugin'
  if (t.includes('/api/plugins/enable')) return 'Mengaktifkan plugin'
  if (t.includes('/api/plugins/disable')) return 'Menonaktifkan plugin'

  if (t.includes('/api/files/save')) return 'Mengedit file server'
  if (t.includes('/api/files/upload')) return 'Mengupload file server'
  if (t.includes('/api/files/delete')) return 'Menghapus file server'
  if (t.includes('/api/files/rename')) return 'Mengubah nama file server'

  if (t.includes('/api/backups/create')) return 'Membuat backup'
  if (t.includes('/api/backups/restore')) return 'Restore backup'
  if (t.includes('/api/backups/delete')) return 'Menghapus backup'

  if (t.includes('/api/worlds/delete')) return 'Menghapus world'
  if (t.includes('/api/worlds/create')) return 'Membuat world'
  if (t.includes('/api/worlds/load')) return 'Load world'
  if (t.includes('/api/worlds/unload')) return 'Unload world'

  if (t.includes('/api/auth/audit')) return 'Membuka Admin Activity'
  if (t.includes('/api/auth/sessions')) return 'Melihat session admin'
  if (t.includes('/api/auth/me')) return 'Memeriksa session login'

  return target || action || '--'
}

function AuditStat({ label, value, hint }) {
  return (
    <div className="activity-stat">
      <div className="activity-stat-label">{label}</div>
      <div className="activity-stat-value">{value ?? '--'}</div>
      {hint ? <div className="activity-stat-hint">{hint}</div> : null}
    </div>
  )
}

export default function AdminActivity() {
  const toast = useToast()
  const { user } = useAuth()

  const [summary, setSummary] = useState(null)
  const [logs, setLogs] = useState([])
  const [sessions, setSessions] = useState([])
  const [query, setQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')

  const isOwner = user?.role === 'owner'

  const loadData = useCallback(async () => {
    setLoading(true)

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
      toast(e.message || 'Gagal memuat admin activity.', 'danger')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (isOwner) {
      loadData()
    }
  }, [isOwner, loadData])

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase()

    return logs.filter((item) => {
      const level = riskLevel(item.action, item.target)

      if (filterRisk !== 'all' && level !== filterRisk) {
        return false
      }

      if (!q) return true

      const haystack = [
        item.username,
        item.action,
        item.target,
        formatAuditTarget(item),
        item.ip,
        item.created_at,
        ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [logs, query, filterRisk])

  const visibleLogs = useMemo(() => {
    return filteredLogs.slice(0, AUDIT_DISPLAY_LIMIT)
  }, [filteredLogs])

  const visibleSessions = useMemo(() => {
    return sessions.slice(0, SESSION_DISPLAY_LIMIT)
  }, [sessions])

  async function revokeSession(tokenHash, username) {
    const ok = window.confirm(`Revoke session milik ${username}?`)

    if (!ok) return

    setBusy(tokenHash)

    try {
      const res = await postJson('/api/auth/sessions/revoke', {
        token_hash: tokenHash,
      })

      toast(res.message || 'Session berhasil direvoke.', res.success ? 'success' : 'danger')
      await loadData()
    } catch (e) {
      toast(e.message || 'Gagal revoke session.', 'danger')
    } finally {
      setBusy('')
    }
  }

  if (!isOwner) {
    return (
      <div className="panel-card">
        <div className="panel-head compact">
          <div>
            <h3>Admin Activity</h3>
            <p>Halaman ini hanya bisa diakses oleh owner.</p>
          </div>
        </div>

        <div className="text-muted">
          Akunmu saat ini role-nya <b>{user?.role || 'unknown'}</b>.
        </div>
      </div>
    )
  }

  return (
    <div className="admin-activity-page admin-activity-compact">
      <section className="activity-hero panel-card">
        <div className="activity-hero-copy">
          <div className="activity-eyebrow">System Monitor</div>
          <h3>Admin Activity</h3>
          <p>Pantau login, session, command, dan aktivitas penting dari admin dashboard.</p>

          <div className="activity-hero-actions">
            <button className="btn btn-sm btn-soft" onClick={loadData} disabled={loading}>
              <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'} me-1`} />
              Refresh
            </button>

            <span className="activity-mini-note">
              Fetch {logs.length} logs · tampil {AUDIT_DISPLAY_LIMIT}
            </span>
          </div>
        </div>

        <div className="activity-stat-grid">
          <AuditStat label="Actions" value={summary?.total_actions} hint="Log terbaru" />
          <AuditStat label="Admins" value={summary?.active_admins} hint="Aktif" />
          <AuditStat label="Commands" value={summary?.commands} hint="Console/API" />
          <AuditStat label="Server" value={summary?.server_actions} hint="Start/restart" />
          <AuditStat label="Files" value={summary?.file_actions} hint="File access" />
          <AuditStat label="Failed" value={summary?.failed_login} hint="Login gagal" />
        </div>
      </section>

      <div className="activity-content-grid">
        <section className="panel-card activity-log-panel">
          <div className="activity-section-head">
            <div>
              <h3>Audit Logs</h3>
              <p>Menampilkan {visibleLogs.length} dari {filteredLogs.length} hasil pencarian</p>
            </div>
          </div>

          <div className="activity-toolbar">
            <div className="searchbar-wrap">
              <i className="bi bi-search text-muted" />
              <input
                className="form-control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search admin, action, target, IP..."
              />
            </div>

            <select
              className="form-select activity-risk-select"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
            >
              <option value="all">All Risk</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="table-responsive activity-table-wrap">
            <table className="table align-middle mb-0 activity-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Admin</th>
                  <th>Risk</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP</th>
                </tr>
              </thead>

              <tbody>
                {visibleLogs.map((item, index) => {
                  const level = riskLevel(item.action, item.target)

                  return (
                    <tr key={`${item.created_at}-${index}`}>
                      <td className="font-monospace text-muted">{fmtTime(item.created_at)}</td>
                      <td>{compactText(item.username)}</td>
                      <td>
                        <span className={`risk-chip ${level}`}>
                          {riskLabel(level)}
                        </span>
                      </td>
<                       td className="font-monospace">{compactText(item.action)}</td>                      <td className="activity-target" title={item.target || ''}>
                        {formatAuditTarget(item)}
                    </td>
                      <td className="font-monospace text-muted activity-ip" title={item.ip || ''}>
                        {compactText(item.ip)}
                      </td>
                    </tr>
                  )
                })}

                {!visibleLogs.length && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      Tidak ada audit log.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel-card activity-session-panel">
          <div className="activity-section-head">
            <div>
              <h3>Active Sessions</h3>
              <p>Menampilkan {visibleSessions.length} dari {sessions.length} session</p>
            </div>
          </div>

          <div className="session-stack compact">
            {visibleSessions.map((session) => (
              <div className="session-item" key={session.token_hash}>
                <div className="session-top">
                  <div>
                    <b>{session.username}</b>
                    <small>{session.role}</small>
                  </div>

                  <span className="font-monospace text-muted">
                    {shortHash(session.token_hash)}
                  </span>
                </div>

                <div className="session-meta">
                  <div>
                    <span>IP</span>
                    <b title={session.ip || ''}>{session.ip || '--'}</b>
                  </div>

                  <div>
                    <span>Last seen</span>
                    <b>{fmtTime(session.last_seen_at)}</b>
                  </div>
                </div>

                <div className="session-agent" title={session.user_agent || ''}>
                  {session.user_agent || 'Unknown device'}
                </div>

                <button
                  className="btn btn-sm btn-danger-soft w-100 mt-2"
                  onClick={() => revokeSession(session.token_hash, session.username)}
                  disabled={busy === session.token_hash}
                >
                  {busy === session.token_hash ? 'Revoking...' : 'Revoke'}
                </button>
              </div>
            ))}

            {!visibleSessions.length && (
              <div className="text-muted small">
                Tidak ada session aktif.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}