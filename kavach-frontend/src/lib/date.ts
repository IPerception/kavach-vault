const DAY_MS = 86_400_000

/**
 * Short relative age: "today", "2d ago", "1w ago", "5mo ago", "1y ago". Dates in the
 * future (clock skew) read as "today".
 */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const days = Math.floor((now - new Date(iso).getTime()) / DAY_MS)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
