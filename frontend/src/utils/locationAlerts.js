const KEY = 'hfm_location_alerts'

export function loadLocationAlerts() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function saveLocationAlerts(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function pushLocationAlert(entry) {
  const prev = loadLocationAlerts()
  saveLocationAlerts([entry, ...prev].slice(0, 100))
}

export function clearLocationAlerts() {
  localStorage.removeItem(KEY)
}
