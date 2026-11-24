import { describe, it, expect } from 'vitest'
import {
  isStale,
  passwordAgeDate,
  strengthBucket,
  summarize,
  tagCounts,
} from '../lib/attention'
import type { CredentialHealth, CredentialSummary } from '../api/types'

const NOW = new Date('2026-06-01T12:00:00Z').getTime()
const DAY = 86_400_000
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

function cred(id: number, over: Partial<CredentialSummary> = {}): CredentialSummary {
  return {
    id,
    purpose: `item ${id}`,
    credentialType: 'PASSWORD',
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
    ...over,
  }
}

function health(id: number, strengthScore: CredentialHealth['strengthScore']): CredentialHealth {
  return { id, purpose: `item ${id}`, strengthScore, strengthLabel: 'x', duplicate: false, updatedAt: daysAgo(1) }
}

describe('strengthBucket', () => {
  it.each([
    [0, 'weak'],
    [1, 'weak'],
    [2, 'fair'],
    [3, 'strong'],
    [4, 'strong'],
  ])('maps score %i to %s', (score, bucket) => {
    expect(strengthBucket(score)).toBe(bucket)
  })
})

describe('passwordAgeDate', () => {
  // The backend PR that adds passwordChangedAt switches this seam; update this test with it.
  it('currently reads updatedAt', () => {
    expect(passwordAgeDate({ updatedAt: '2026-01-02T03:04:05Z' })).toBe('2026-01-02T03:04:05Z')
  })
})

describe('isStale', () => {
  it('is stale at exactly N days but not at N-1', () => {
    expect(isStale(daysAgo(90), 90, NOW)).toBe(true)
    expect(isStale(daysAgo(89), 90, NOW)).toBe(false)
  })
})

describe('summarize', () => {
  const credentials = [
    cred(1), // fresh, strong
    cred(2), // fresh, weak
    cred(3, { updatedAt: daysAgo(100) }), // stale, strong
    cred(4, { updatedAt: daysAgo(100) }), // stale and weak
    cred(5, { credentialType: 'NOTE', updatedAt: daysAgo(500) }), // note: never counted
  ]
  const healthById = new Map([
    [1, health(1, 4)],
    [2, health(2, 1)],
    [3, health(3, 3)],
    [4, health(4, 0)],
  ])

  it('counts weak, stale and their union (each credential once)', () => {
    const s = summarize(credentials, healthById, 90, NOW)
    expect(s.weakIds).toEqual([2, 4])
    expect(s.staleIds).toEqual([3, 4])
    expect(s.attentionIds).toEqual([2, 3, 4])
    expect(s.counts).toEqual({ weak: 2, stale: 2, attention: 3 })
  })

  it('excludes notes even when they are old', () => {
    const s = summarize(credentials, healthById, 90, NOW)
    expect(s.attentionIds).not.toContain(5)
  })

  it('counts only staleness when health is unavailable', () => {
    const s = summarize(credentials, undefined, 90, NOW)
    expect(s.weakIds).toEqual([])
    expect(s.attentionIds).toEqual([3, 4])
  })
})

describe('tagCounts', () => {
  it('counts credentials per tag, sorted by name, once per credential', () => {
    const list = [
      cred(1, { tags: ['work', 'bank'] }),
      cred(2, { tags: ['work', 'work'] }),
      cred(3),
    ]
    expect(tagCounts(list)).toEqual([
      { tag: 'bank', count: 1 },
      { tag: 'work', count: 2 },
    ])
  })
})
