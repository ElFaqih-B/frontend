import React from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import Login from '../pages/Login.jsx'

export default function RequireAuth({ children }) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-title">Loading</div>
          <div className="login-subtitle">Memeriksa sesi login...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return children
}