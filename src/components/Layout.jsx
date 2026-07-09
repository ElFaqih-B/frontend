import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { apiUrl, getJson } from '../api.js'
import { pages, pageTitle } from '../constants/navigation.js'
import AccentPicker from './AccentPicker.jsx'

function statusClass(status) {
  if (status === 'ONLINE') return 'online'
  if (status === 'STARTING') return 'starting'
  if (status === 'API OFFLINE') return 'offline'
  return 'offline'
}

function navGroup(key) {
  if (['dashboard', 'console', 'players', 'worlds', 'plugins', 'files', 'backups', 'scheduler'].includes(key)) return 'Server'
  return 'Sistem'
}

export default function Layout({ children }) {
  const [sideOpen, setSideOpen] = useState(false)
  const [status, setStatus] = useState({ status: '...', tps: '--', mspt: '--', uptime: '--' })
  const location = useLocation()
  const apiBase = useMemo(() => apiUrl(), [])

  const pollStatus = useCallback(async () => {
    try {
      const data = await getJson('/api/status')
      setStatus(data)
    } catch {
      setStatus((prev) => ({ ...prev, status: 'API OFFLINE', tps: '--', mspt: '--' }))
    }
  }, [])

  useEffect(() => {
    pollStatus()
    const id = setInterval(pollStatus, 5000)
    return () => clearInterval(id)
  }, [pollStatus])

  const tone = statusClass(status.status)
  const title = pageTitle(location.pathname)
  let currentGroup = ''

  return (
    <>
      <div className={`sidebar-scrim ${sideOpen ? 'show' : ''}`} onClick={() => setSideOpen(false)} />

      <aside id="sb" className={sideOpen ? 'open' : ''}>
        <div className="brand">
          <div>
            <div className="brand-title">PooPers.panel</div>
            <div className="brand-subtitle">Minecraft Server Control</div>
          </div>
        </div>

        <nav className="nav flex-column sidebar-nav">
          {pages.map(([path, key, icon, label]) => {
            const group = navGroup(key)
            const showLabel = group !== currentGroup
            currentGroup = group
            return (
              <React.Fragment key={key}>
                {showLabel ? <div className="nav-group-label">{group}</div> : null}
                <NavLink
                  to={path}
                  end={path === '/'}
                  className="nav-link nav-item"
                  onClick={() => setSideOpen(false)}
                >
                  <i className={`bi ${icon}`} />
                  <span>{label}</span>
                </NavLink>
              </React.Fragment>
            )
          })}
        </nav>

        <AccentPicker placement="sidebar" />

        <div className="sidebar-footer">
          <div className="server-pill">
            <span className={`dot ${tone}`} />
            <div className="server-pill-text min-w-0">
              <b>{status.status || 'OFFLINE'}</b>
              <small title={apiBase}>{apiBase}</small>
            </div>
          </div>
        </div>
      </aside>

      <div id="mc">
        <header id="topbar" className="topbar">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <button className="btn btn-icon d-md-none" onClick={() => setSideOpen((x) => !x)}>
              <i className="bi bi-list" />
            </button>
            <div className="min-w-0">
              <div className="topbar-title">{title}</div>
              <div className="topbar-sub">TPS {status.tps || '--'} · MSPT {status.mspt || '--'} · uptime {status.uptime || '--'}</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`health-pill status ${tone}`}>
              <span className={`dot ${tone}`} />
              <span>{status.status || '--'}</span>
            </div>
          </div>
        </header>

        <main className="content app-container">{children}</main>
      </div>
    </>
  )
}
