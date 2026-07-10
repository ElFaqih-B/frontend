import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try { await login(username.trim(), password) } catch (err) { setError(err.message || 'Login gagal.') } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-4 text-textc">
      <form onSubmit={submit} className="panel-pad w-full max-w-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative h-[24px] w-[24px] rounded-[5px] bg-accent after:absolute after:inset-[6px] after:bg-panel after:[clip-path:polygon(0_0,100%_0,100%_40%,40%_40%,40%_100%,0_100%)]" />
          <div className="font-mono text-base font-semibold">craft<span className="text-faint">.panel</span></div>
        </div>
        <h1 className="text-lg font-semibold">Login dashboard</h1>
        <p className="mt-1 text-sm text-dim">Masuk untuk mengontrol server Minecraft.</p>
        {error ? <div className="mt-4 rounded-panel border border-red/50 bg-red/10 px-3 py-2 text-sm text-red">{error}</div> : null}
        <div className="mt-4 space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">Username</span><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-dim">Password</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        </div>
        <button className="btn btn-accent mt-4 w-full" disabled={busy}>{busy ? 'Masuk...' : 'Login'}</button>
      </form>
    </div>
  )
}
