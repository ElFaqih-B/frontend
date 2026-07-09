const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const TOKEN_KEY = 'poopers_panel_token'

export function apiUrl(path = '') {
  if (!path) return API_BASE
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

function authHeaders(extra = {}) {
  const headers = new Headers(extra)
  const token = getToken()

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

async function parseResponse(res) {
  const text = await res.text()

  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { success: false, message: text || res.statusText }
  }
}

async function request(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: authHeaders(options.headers),
  })

  const data = await parseResponse(res)

  if (res.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('auth:unauthorized'))
    throw new Error(data.message || 'Unauthorized. Silakan login ulang.')
  }

  if (!res.ok) {
    throw new Error(data.message || data.detail || `Request gagal: ${res.status}`)
  }

  return data
}

export function getJson(path) {
  return request(path, {
    method: 'GET',
  })
}

export function postJson(path, body = {}) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
}

export function postForm(path, formData) {
  return request(path, {
    method: 'POST',
    body: formData,
  })
}

export function wsUrl(path = '') {
  const url = new URL(apiUrl(path))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  const token = getToken()
  if (token) {
    url.searchParams.set('token', token)
  }

  return url.toString()
}