import React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiUrl, clearToken, getJson, getToken, postJson, saveToken } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    try {
      if (getToken()) await postJson('/api/auth/logout')
    } catch {
      // logout lokal tetap dilakukan
    } finally {
      clearToken()
      setTokenState(null)
      setUser(null)
    }
  }, [])

  const checkSession = useCallback(async () => {
    const currentToken = getToken()
    if (!currentToken) {
      setTokenState(null)
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const data = await getJson('/api/auth/me')
      if (data.success && data.user) {
        setTokenState(currentToken)
        setUser(data.user)
      } else {
        clearToken()
        setTokenState(null)
        setUser(null)
      }
    } catch {
      clearToken()
      setTokenState(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success || !data.token) throw new Error(data.message || 'Login gagal.')
    saveToken(data.token)
    setTokenState(data.token)
    setUser(data.user || { username })
    return data
  }, [])

  useEffect(() => {
    checkSession()
    function onUnauthorized() {
      clearToken()
      setTokenState(null)
      setUser(null)
    }
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [checkSession])

  const value = useMemo(() => ({ token, user, loading, isAuthenticated: Boolean(token), login, logout, checkSession }), [token, user, loading, login, logout, checkSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
