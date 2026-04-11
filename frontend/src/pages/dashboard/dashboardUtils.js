export const PIE_COLORS = ['#5a7c5e', '#c9a227', '#3d6b8c', '#b8573d', '#8b7aa8']

export function formatTick(t) {
  if (t == null || typeof t !== 'string') return ''
  return t.length >= 7 ? t.slice(0, 7) : t
}

export function probName(name) {
  return String(name).replace(/_/g, ' ')
}
