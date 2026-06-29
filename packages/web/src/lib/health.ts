export function healthColor(score: number) {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function formatHours(h: number) {
  if (h === 0) return '—'
  if (h < 1) return '<1h'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
