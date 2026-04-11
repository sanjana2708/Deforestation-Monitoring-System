const KEY = 'hfm_session'

export function getSession() {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession({ email }, persist = true) {
  const data = JSON.stringify({ email })
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
  if (persist) localStorage.setItem(KEY, data)
  else sessionStorage.setItem(KEY, data)
}

export function clearSession() {
  localStorage.removeItem(KEY)
  sessionStorage.removeItem(KEY)
}
