import React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getJson, postJson } from '../api.js'
import { pageTitle } from '../constants/navigation.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useToast } from '../contexts/ToastContext.jsx'
import AccentPicker from './AccentPicker.jsx'
import Icon from './Icons.jsx'
import Sidebar from './Sidebar.jsx'

function statusTone(status) {
  const value = String(status || '').toUpperCase()
  if (value === 'ONLINE') return 'bg-green'
  if (value === 'STARTING') return 'bg-yellow'
  return 'bg-red'
}

function statusLabel(status) {
  const value = String(status || '').trim()
  if (!value || value === '...') return 'Loading'
  if (value.toUpperCase() === 'API OFFLINE') return 'API Offline'
  return value
}

export default function Layout({ children }) {
  const { logout } = useAuth()
  const toast = useToast()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [serverBusy, setServerBusy] = useState('')
  const [status, setStatus] = useState({ status: '...', tps: '--', mspt: '--', uptime: '--' })

  const pollStatus = useCallback(async () => {
    try {
      const data = await getJson('/api/status')
      setStatus(data || {})
    } catch {
      setStatus((prev) => ({ ...prev, status: 'API OFFLINE', tps: '--', mspt: '--' }))
    }
  }, [])

  useEffect(() => {
    pollStatus()
    const id = setInterval(pollStatus, 5000)
    return () => clearInterval(id)
  }, [pollStatus])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!logoutOpen) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setLogoutOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [logoutOpen])

  async function confirmLogout() {
    setLogoutBusy(true)
    try {
      await logout()
    } finally {
      setLogoutBusy(false)
      setLogoutOpen(false)
      setOpen(false)
    }
  }

  async function serverAction(action) {
    if (action === 'kill' && !window.confirm('Kill paksa proses Java?')) return

    setServerBusy(action)
    try {
      const result = await postJson(`/api/${action}`)
      toast(result.message || result.response || `${action} dikirim.`, result.success === false ? 'danger' : 'success')
      setTimeout(pollStatus, 900)
    } catch (e) {
      toast(e.message || `Gagal ${action}.`, 'danger')
    } finally {
      setServerBusy('')
    }
  }

  const title = pageTitle(location.pathname)
  const label = statusLabel(status.status)
  const tone = statusTone(status.status)
  const subtitle = useMemo(() => {
    const parts = []
    if (status.server_ip) parts.push(status.server_port ? `${status.server_ip}:${status.server_port}` : status.server_ip)
    if (status.mc_ver || status.paper_ver) parts.push(status.mc_ver || status.paper_ver)
    parts.push(`TPS ${status.tps ?? '--'}`)
    if (status.uptime) parts.push(`uptime ${status.uptime}`)
    return parts.join(' · ')
  }, [status])

  return (
    <div className="min-h-screen bg-bg text-textc">
      <Sidebar open={open} onClose={() => setOpen(false)} onLogout={() => setLogoutOpen(true)} />

      {logoutOpen ? (
        <div className="fixed inset-0 z-[1900] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={() => setLogoutOpen(false)}>
          <section className="panel w-full max-w-md" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-4">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-panel border border-[color-mix(in_srgb,var(--red)_38%,var(--border))] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] text-red">
                <Icon name="logout" />
              </div>
              <h3 className="text-base font-semibold text-textc">Logout dari dashboard?</h3>
              <p className="mt-1 text-sm text-dim">Sesi login di browser ini akan dihapus. Kamu perlu login ulang untuk mengakses panel.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn" disabled={logoutBusy} onClick={() => setLogoutOpen(false)}>Batal</button>
                <button className="btn btn-danger" disabled={logoutBusy} onClick={confirmLogout}>{logoutBusy ? 'Logout...' : 'Logout'}</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      <main className="min-h-screen md:pl-[232px]">
        <header className="sticky top-0 z-[900] flex min-h-[62px] flex-col gap-3 border-b border-soft bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-3.5 py-3 backdrop-blur sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button className="btn btn-icon md:hidden" onClick={() => setOpen(true)} aria-label="Open sidebar">
              <Icon name="menu" />
            </button>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-textc">{title}</div>
              <div className="mt-0.5 truncate text-xs text-faint">{subtitle}</div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AccentPicker compact />
            <span className="inline-flex items-center gap-2 rounded-panel border border-borderc bg-panel px-2.5 py-1.5 text-xs text-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
              {label}
            </span>
            <button className="btn btn-accent" disabled={!!serverBusy} onClick={() => serverAction('start')}>
              <Icon name="play" className="h-3.5 w-3.5" />
              Start
            </button>
            <button className="btn" disabled={!!serverBusy} onClick={() => serverAction('restart')}>
              <Icon name="refresh" className="h-3.5 w-3.5" />
              Restart
            </button>
            <button className="btn btn-danger" disabled={!!serverBusy} onClick={() => serverAction('stop')}>
              <Icon name="stop" className="h-3.5 w-3.5" />
              Stop
            </button>
            <button className="btn btn-icon" onClick={() => setLogoutOpen(true)} title="Logout">
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1320px] px-3.5 py-4 pb-16 sm:px-6 sm:py-5">
          {children}
        </div>
      </main>
    </div>
  )
}
