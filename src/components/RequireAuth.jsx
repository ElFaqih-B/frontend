import React from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import Login from '../pages/Login.jsx'
export default function RequireAuth({ children }) {
  const { loading, isAuthenticated } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center bg-bg p-4"><div className="panel-pad w-full max-w-sm"><div className="text-lg font-semibold">Loading</div><div className="mt-1 text-sm text-faint">Memeriksa sesi login...</div></div></div>
  if (!isAuthenticated) return <Login />
  return children
}
