const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export function apiUrl(path = '') {
  if (!path) return API_BASE
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function wsUrl(path = '') {
  const url = new URL(apiUrl(path))
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

async function parseResponse(res, path) {
  const text = await res.text()
  let payload = null

  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { message: text || `${res.status} ${res.statusText}` }
  }

  if (!res.ok) {
    const msg = payload?.detail || payload?.message || `${path} gagal: ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }

  return payload
}

export async function getJson(path) {
  const res = await fetch(apiUrl(path))
  return parseResponse(res, path)
}

export async function postJson(path, body = {}) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseResponse(res, path)
}

export async function postForm(path, formData) {
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    body: formData,
  })
  return parseResponse(res, path)
}
