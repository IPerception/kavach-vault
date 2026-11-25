import { describe, it, expect } from 'vitest'
import { formatRelative } from '../lib/date'

const NOW = new Date('2026-11-24T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

describe('formatRelative', () => {
  it('reads anything under a day, or in the future, as today', () => {
    expect(formatRelative(daysAgo(0), NOW)).toBe('today')
    expect(formatRelative(new Date(NOW + 3_600_000).toISOString(), NOW)).toBe('today')
  })

  it('counts days up to a week', () => {
    expect(formatRelative(daysAgo(1), NOW)).toBe('1d ago')
    expect(formatRelative(daysAgo(2), NOW)).toBe('2d ago')
    expect(formatRelative(daysAgo(6), NOW)).toBe('6d ago')
  })

  it('counts weeks up to a month', () => {
    expect(formatRelative(daysAgo(7), NOW)).toBe('1w ago')
    expect(formatRelative(daysAgo(21), NOW)).toBe('3w ago')
    expect(formatRelative(daysAgo(29), NOW)).toBe('4w ago')
  })

  it('counts months up to a year', () => {
    expect(formatRelative(daysAgo(30), NOW)).toBe('1mo ago')
    expect(formatRelative(daysAgo(150), NOW)).toBe('5mo ago')
    expect(formatRelative(daysAgo(364), NOW)).toBe('12mo ago')
  })

  it('counts years', () => {
    expect(formatRelative(daysAgo(365), NOW)).toBe('1y ago')
    expect(formatRelative(daysAgo(800), NOW)).toBe('2y ago')
  })
})
