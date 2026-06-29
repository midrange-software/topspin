export function statusBadgeVariant(statusCategory: string): 'default' | 'secondary' | 'outline' {
  const cat = statusCategory.toLowerCase()
  if (cat === 'done') return 'default'
  if (cat === 'in progress') return 'secondary'
  return 'outline'
}

export function priorityBadgeVariant(priority: string | null): 'destructive' | 'secondary' | 'outline' {
  if (!priority) return 'outline'
  const p = priority.toLowerCase()
  if (p === 'highest' || p === 'high') return 'destructive'
  if (p === 'medium') return 'secondary'
  return 'outline'
}

export function prStateBadgeVariant(state: string, mergedAt: string | null): 'default' | 'secondary' | 'outline' {
  if (mergedAt) return 'default'
  if (state === 'open') return 'secondary'
  return 'outline'
}

export function sprintStateBadgeVariant(state: string): 'default' | 'secondary' | 'outline' {
  if (state === 'active') return 'default'
  if (state === 'closed') return 'secondary'
  return 'outline'
}

export function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'owner') return 'default'
  if (role === 'admin') return 'secondary'
  return 'outline'
}

export function nameInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
