import React from 'react'
import { NavLink } from 'react-router-dom'
import { pages } from '../constants/navigation.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import Icon from './Icons.jsx'

const SERVER_KEYS = new Set(['dashboard', 'console', 'players', 'worlds', 'plugins', 'files', 'backups', 'scheduler'])
const OWNER_ONLY_KEYS = new Set(['settings', 'admin-activity'])

function groupsFor(roleValue) {
  const role = String(roleValue || '').toLowerCase()
  const visible = pages.filter(([, key]) => OWNER_ONLY_KEYS.has(key) ? role === 'owner' : true)
  return [
    { title: 'Server', items: visible.filter(([, key]) => SERVER_KEYS.has(key)) },
    { title: 'Sistem', items: visible.filter(([, key]) => !SERVER_KEYS.has(key)) },
  ].filter((x) => x.items.length)
}

export default function Sidebar({ open, onClose, onLogout }) {
  const { user } = useAuth()
  const groups = groupsFor(user?.role)

  return (
    <>
      <div className={`fixed inset-0 z-[990] bg-black/55 backdrop-blur-sm transition md:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={onClose} />
      <aside className={`fixed inset-y-0 left-0 z-[1000] flex h-dvh w-[232px] flex-col border-r border-soft bg-raised p-3 transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-3 flex h-[52px] shrink-0 items-center gap-2 border-b border-soft px-2 pb-3">
          {/* <div className="relative h-[22px] w-[22px] shrink-0 rounded-[5px] bg-accent after:absolute after:inset-[6px] after:bg-raised after:[clip-path:polygon(0_0,100%_0,100%_40%,40%_40%,40%_100%,0_100%)]" /> */}
          <div className="min-w-0 font-mono text-[13.5px] font-semibold tracking-[-0.02em] text-textc">PooPers<span className="text-faint">.panel</span></div>
        </div>

        <nav className="min-h-0 flex-1 overflow-hidden">
          {groups.map((group) => (
            <section key={group.title} className="mb-2">
              <div className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-faint">{group.title}</div>
              <div className="space-y-1">
                {group.items.map(([path, key, icon, label]) => (
                  <NavLink key={key} to={path} end={path === '/'} onClick={onClose} className={({ isActive }) => `flex h-[34px] items-center gap-2 rounded-panel border px-2.5 text-[13px] transition ${isActive ? 'border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-dim2)] text-[var(--accent-text)]' : 'border-transparent text-dim hover:bg-hover hover:text-textc'}`}>
                    <Icon name={icon} className="h-[15px] w-[15px] shrink-0 opacity-90" />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="shrink-0 border-t border-soft pt-3">
          <div className="mb-2 min-w-0 rounded-panel border border-soft bg-panel px-2.5 py-2">
            <div className="truncate text-[12px] font-semibold text-textc">{user?.username || 'Admin'}</div>
            <div className="truncate font-mono text-[10.5px] capitalize text-faint">{user?.role || 'admin'}</div>
          </div>
          <button className="btn btn-sm w-full" onClick={onLogout}><Icon name="logout" className="h-3.5 w-3.5" />Logout</button>
        </div>
      </aside>
    </>
  )
}
