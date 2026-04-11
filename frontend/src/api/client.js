const DEFAULT_BASE = 'http://localhost:8000'

export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (raw == null || String(raw).trim() === '') return DEFAULT_BASE
  return String(raw).replace(/\/$/, '')
}

export function cnnDatasetFileUrl(filename) {
  return `${getApiBaseUrl()}/cnn-dataset/file/${encodeURIComponent(filename)}`
}

/**
 * @param {string} path - e.g. "/analyze" or "analyze"
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export function apiFetch(path, init = {}) {
  const base = getApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${p}`
  const headers = new Headers(init.headers)
  if (init.body != null && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...init, headers })
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
export async function apiJson(path, init = {}) {
  const res = await apiFetch(path, init)
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' && data?.detail ? String(data.detail) : res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
