import type { CredentialHealth, CredentialSummary } from '../api/types'

export type StrengthBucket = 'weak' | 'fair' | 'strong'

/** Score 0-1 = weak (the same rule HealthReport uses), 2 = fair, 3-4 = strong. */
export function strengthBucket(score: number): StrengthBucket {
  if (score <= 1) return 'weak'
  if (score === 2) return 'fair'
  return 'strong'
}

/**
 * The date a password's age is measured from. EVERY staleness check must read it through
 * this function. passwordChangedAt moves only when the password itself changes (not when
 * the username, URL or tags do); updatedAt is the fallback for responses that lack it.
 */
export function passwordAgeDate(c: { updatedAt: string; passwordChangedAt?: string | null }): string {
  return c.passwordChangedAt ?? c.updatedAt
}

export function daysSince(iso: string, now: number = Date.now()): number {
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000)
}

/** True once the date is at least `days` whole days old. */
export function isStale(iso: string, days: number, now: number = Date.now()): boolean {
  return daysSince(iso, now) >= days
}

export interface AttentionSummary {
  weakIds: number[]
  staleIds: number[]
  /** Union of weakIds and staleIds. */
  attentionIds: number[]
  counts: { weak: number; stale: number; attention: number }
}

/**
 * Which passwords need attention. Notes are excluded. `healthById` is undefined while
 * health is loading or failed; weak is then not counted and only staleness is.
 */
export function summarize(
  credentials: CredentialSummary[],
  healthById: ReadonlyMap<number, CredentialHealth> | undefined,
  days: number,
  now: number = Date.now(),
): AttentionSummary {
  const weakIds: number[] = []
  const staleIds: number[] = []
  const attentionIds: number[] = []

  for (const c of credentials) {
    if (c.credentialType === 'NOTE') continue
    const health = healthById?.get(c.id)
    const weak = health !== undefined && strengthBucket(health.strengthScore) === 'weak'
    const stale = isStale(passwordAgeDate(c), days, now)
    if (weak) weakIds.push(c.id)
    if (stale) staleIds.push(c.id)
    if (weak || stale) attentionIds.push(c.id)
  }

  return {
    weakIds,
    staleIds,
    attentionIds,
    counts: { weak: weakIds.length, stale: staleIds.length, attention: attentionIds.length },
  }
}

/** Tag -> number of credentials carrying it, sorted by tag name. */
export function tagCounts(credentials: CredentialSummary[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const c of credentials) {
    for (const tag of new Set(c.tags ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}
