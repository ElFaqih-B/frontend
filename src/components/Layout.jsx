import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { apiUrl, getJson } from '../api.js'
import { pages, pageTitle } from '../constants/navigation.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import AccentPicker from './AccentPicker.jsx'

const SERVER_KEYS = new Set([
  'dashboard',
  'console',
  'players',
  'worlds',
  'plugins',
  'files',
  'backups',
  'scheduler',
])

const OWNER_ONLY_KEYS = new Set([
  'settings',
  'admin-activity',
])

function statusClass(status) {
  const value = String(status || '').toUpperCase()

  if (value === 'ONLINE') return 'online'
  if (value === 'STARTING') return 'starting'

  return 'offline'
}

function statusLabel(status) {
  const value = String(status || '').trim()

  if (!value || value === '...') return 'Loading'
  if (value.toUpperCase() === 'API OFFLINE') return 'API Offline'

  return value
}

function getGroups(roleValue) {
  const role = String(roleValue || '').toLowerCase()

  const visiblePages = pages.filter(([, key]) => {
    if (OWNER_ONLY_KEYS.has(key)) {
      return role === 'owner'
    }

    return true
  })

  return [
    {
      title: 'Server',
      items: visiblePages.filter(([, key]) => SERVER_KEYS.has(key)),
    },
    {
      title: 'Sistem',
      items: visiblePages.filter(([, key]) => !SERVER_KEYS.has(key)),
    },
  ].filter((group) => group.items.length)
}

function SidebarLink({ item, onClick }) {
  const [path, key, icon, label] = item

  return (
    <NavLink
      to={path}
      end={path === '/'}
      className="nav-link nav-item"
      onClick={onClick}
      title={label}
    >
      <i className={`bi ${icon}`} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const [sideOpen, setSideOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const [status, setStatus] = useState({
    status: '...',
    tps: '--',
    mspt: '--',
    uptime: '--',
  })

  const apiBase = useMemo(() => apiUrl(), [])
  const groups = useMemo(() => getGroups(user?.role), [user?.role])

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
    if (!logoutOpen) return

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setLogoutOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [logoutOpen])

  async function confirmLogout() {
    setLogoutBusy(true)

    try {
      await logout()
    } finally {
      setLogoutBusy(false)
      setLogoutOpen(false)
      setSideOpen(false)
    }
  }

  const tone = statusClass(status.status)
  const label = statusLabel(status.status)
  const title = pageTitle(location.pathname)

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
              <p>Sesi login di browser ini akan dihapus. Kamu perlu login ulang untuk mengakses panel.</p>
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
          <div className="brand-text">
            <div className="brand-title">PooPers.panel</div>
            <div className="brand-subtitle">Minecraft Server Control</div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Sidebar navigation">
          {groups.map((group) => (
            <section className="sidebar-nav-group" key={group.title}>
              <div className="nav-group-label">{group.title}</div>

              <div className="sidebar-nav-items">
                {group.items.map((item) => (
                  <SidebarLink
                    key={item[1]}
                    item={item}
                    onClick={() => setSideOpen(false)}
                  />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-accent-box">
            <AccentPicker placement="sidebar" />
          </div>
          <div className="sidebar-user-box">
            <div className="sidebar-user-main">
              <span className="sidebar-user-icon">
                <i className="bi bi-person" />
              </span>

              <div className="sidebar-user-text">
                <b title={user?.username || 'Admin'}>{user?.username || 'Admin'}</b>
                <small>{user?.role || 'admin'}</small>
              </div>
            </div>

            <button
              className="sidebar-logout-btn"
              type="button"
              onClick={() => setLogoutOpen(true)}
            >
              <i className="bi bi-box-arrow-right" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div id="mc">
        <header id="topbar" className="topbar">
          <div className="topbar-left">
            <button
              className="btn btn-icon d-md-none"
              type="button"
              onClick={() => setSideOpen((value) => !value)}
              aria-label="Toggle sidebar"
            >
              <i className="bi bi-list" />
            </button>

            <div className="topbar-title-wrap">
              <div className="topbar-title" title={title}>{title}</div>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`layout-status-pill ${tone}`}>
              <span className="layout-status-dot" />
              <span>{label}</span>
            </div>

            <button
              className="topbar-logout-btn"
              type="button"
              onClick={() => setLogoutOpen(true)}
              title="Logout"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </header>

        <main className="content app-container">{children}</main>
      </div>
    </>
  )
}