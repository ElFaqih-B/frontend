import React from "react"
import { useCallback, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { apiUrl, getJson } from '../api.js'
import { pages, pageTitle } from '../constants/navigation.js'

export default function Layout({ children }) {
  const [sideOpen, setSideOpen] = useState(false)
  const [status, setStatus] = useState({ status: '...', tps: '--' })
  const location = useLocation()

  const pollStatus = useCallback(async () => {
    try {
      const d = await getJson('/api/status')
      setStatus(d)
    } catch {
      setStatus((x) => ({ ...x, status: 'API OFFLINE', tps: '--' }))
    }
  }, [])

  useEffect(() => {
    pollStatus()
    const id = setInterval(pollStatus, 5000)
    return () => clearInterval(id)
  }, [pollStatus])

  const statusClass = status.status === 'ONLINE'
    ? 'online'
    : status.status === 'STARTING'
      ? 'starting'
      : 'offline'

  const apiBase = apiUrl()
  return (
    <>
      <div id="sb" className={sideOpen ? 'open' : ''}>
        <div className="brand">
          <i className="bi bi-box-seam" /> Atomic Dashboard
        </div>

        <nav className="nav flex-column py-3 flex-grow-1">
          {pages.map(([path, key, icon, label]) => (
            <NavLink
              key={key}
              to={path}
              end={path === '/'}
              className="nav-link"
              onClick={() => setSideOpen(false)}
            >
              <i className={`bi ${icon}`} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-title">Server Local</div>

          <div className="sidebar-url" title={apiBase}>
            {apiBase}
          </div>
        </div>
      </div>

      <div id="mc">
        <div id="topbar">
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-sm btn-outline-secondary d-md-none px-2" onClick={() => setSideOpen((x) => !x)}>
              <i className="bi bi-list fs-5" />
            </button>
            <span className="fw-semibold text-light">{pageTitle(location.pathname)}</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small fw-medium">TPS: {status.tps || '--'}</span>
            <span className={`fw-semibold small d-flex align-items-center gap-2 ${statusClass}`}>
              <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }} />
              <span>{status.status}</span>
            </span>
          </div>
        </div>

        <main className="container-fluid p-4">{children}</main>
      </div>
    </>
  )
}
