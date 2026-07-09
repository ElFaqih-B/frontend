import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { apiUrl, getJson } from '../api.js'
import { pages, pageTitle } from '../constants/navigation.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import AccentPicker from './AccentPicker.jsx'

function statusClass(status) {
  const value = String(status || '').toUpperCase()

  if (value === 'ONLINE') return 'online'
  if (value === 'STARTING') return 'starting'
  if (value === 'API OFFLINE') return 'offline'
  if (value === 'OFFLINE') return 'offline'
  if (value === 'STOPPED') return 'offline'

  return 'offline'
}

function statusLabel(status) {
  const value = String(status || '').trim()

  if (!value || value === '...') return 'Loading'
  if (value.toUpperCase() === 'API OFFLINE') return 'API Offline'

  return value
}

function navGroup(key) {
  if (
    [
      'dashboard',
      'console',
      'players',
      'worlds',
      'plugins',
      'files',
      'backups',
      'scheduler',
    ].includes(key)
  ) {
    return 'Server'
  }

  return 'Sistem'
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  const [sideOpen, setSideOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const [status, setStatus] = useState({
    status: '...',
    tps: '--',
    mspt: '--',
    uptime: '--',
  })

  const location = useLocation()
  const apiBase = useMemo(() => apiUrl(), [])

  const pollStatus = useCallback(async () => {
    try {
      const data = await getJson('/api/status')
      setStatus(data || {})
    } catch {
      setStatus((prev) => ({
        ...prev,
        status: 'API OFFLINE',
        tps: '--',
        mspt: '--',
      }))
    }
  }, [])

  useEffect(() => {
    pollStatus()

    const id = setInterval(pollStatus, 5000)

    return () => clearInterval(id)
  }, [pollStatus])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setLogoutOpen(false)
      }
    }

    if (logoutOpen) {
      window.addEventListener('keydown', onKeyDown)
    }

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [logoutOpen])

  function handleLogout() {
    setLogoutOpen(true)
  }

  async function confirmLogout() {
    setLogoutBusy(true)

    try {
      await logout()
    } finally {
      setLogoutBusy(false)
      setLogoutOpen(false)
    }
  }

  const tone = statusClass(status.status)
  const label = statusLabel(status.status)
  const title = pageTitle(location.pathname)

  let currentGroup = ''

  return (
    <>
      <div
        className={`sidebar-scrim ${sideOpen ? 'show' : ''}`}
        onClick={() => setSideOpen(false)}
      />

      {logoutOpen && (
        <div className="confirm-backdrop" onMouseDown={() => setLogoutOpen(false)}>
          <div className="confirm-dialog" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-icon danger">
              <i className="bi bi-box-arrow-right" />
            </div>

            <div className="confirm-content">
              <h3>Logout dari dashboard?</h3>
              <p>
                Sesi login di browser ini akan dihapus. Kamu perlu login ulang untuk
                mengakses panel.
              </p>
            </div>

            <div className="confirm-actions">
              <button
                className="btn btn-soft"
                type="button"
                onClick={() => setLogoutOpen(false)}
                disabled={logoutBusy}
              >
                Batal
              </button>

              <button
                className="btn btn-danger-soft"
                type="button"
                onClick={confirmLogout}
                disabled={logoutBusy}
              >
                {logoutBusy ? 'Logout...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside id="sb" className={sideOpen ? 'open' : ''}>
        <div className="brand">
          <div className="min-w-0">
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
          <div className={`sidebar-server-status ${tone}`}>
            <span className="layout-status-dot" />

            <div className="sidebar-server-text">
              <b>{label}</b>
              <small title={apiBase}>{apiBase}</small>
            </div>
          </div>

          <div className="sidebar-user-box">
            <div className="sidebar-user-main">
              <span className="sidebar-user-icon">
                <i className="bi bi-person" />
              </span>

              <div className="sidebar-user-text">
                <b>{user?.username || 'Admin'}</b>
                <small>{user?.role || 'admin'}</small>
              </div>
            </div>

            <button className="sidebar-logout-btn" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div id="mc">
        <header id="topbar" className="topbar">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <button
              className="btn btn-icon d-md-none"
              onClick={() => setSideOpen((value) => !value)}
              aria-label="Toggle sidebar"
            >
              <i className="bi bi-list" />
            </button>

            <div className="min-w-0">
              <div className="topbar-title">{title}</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`layout-status-pill ${tone}`}>
              <span className="layout-status-dot" />
              <span>{label}</span>
            </div>

            <button className="topbar-logout-btn" onClick={handleLogout} title="Logout">
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </header>

        <main className="content app-container">{children}</main>
      </div>
    </>
  )
}