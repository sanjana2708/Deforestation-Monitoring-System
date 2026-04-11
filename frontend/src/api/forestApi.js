import { apiFetch, apiJson } from './client'

export function getCnnDatasetItems({ limit = 40, refresh = false } = {}) {
  const q = new URLSearchParams({
    limit: String(limit),
    refresh: String(refresh),
  })
  return apiJson(`/cnn-dataset/items?${q}`)
}

export function postAnalyze(payload) {
  return apiJson('/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function postTimelapseUrl(payload) {
  return apiJson('/timelapse-url', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function postClassifyUpload(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch('/classify-upload', { method: 'POST', body: form })
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
