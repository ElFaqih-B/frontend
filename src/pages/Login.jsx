import React from 'react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err.message || 'Login gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-head">
          <div className="login-title">PooPers.panel</div>
          <div className="login-subtitle">Login untuk mengakses dashboard server.</div>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <label className="login-field">
          <span>Username</span>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className="login-field">
          <span>Password</span>
          <input
            className="form-control"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button className="btn btn-primary w-100" type="submit" disabled={loading || !username || !password}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="login-foot">
          Auth disimpan lokal di browser. Jangan pakai di device umum.
        </div>
      </form>
    </div>
  )
}