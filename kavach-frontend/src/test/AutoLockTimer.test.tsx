import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AutoLockTimer, formatRemaining } from '../components/AutoLockTimer'
import { useKavachStore } from '../store/useKavachStore'

describe('formatRemaining', () => {
  it('formats as mm:ss', () => {
    expect(formatRemaining(10 * 60_000)).toBe('10:00')
    expect(formatRemaining(8 * 60_000 + 42_000)).toBe('08:42')
    expect(formatRemaining(5_000)).toBe('00:05')
  })

  it('never goes negative', () => {
    expect(formatRemaining(-3_000)).toBe('00:00')
  })
})

describe('AutoLockTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useKavachStore.setState({ lastActivity: Date.now() })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at the full timeout', () => {
    render(<AutoLockTimer />)
    expect(screen.getByText('auto-lock in 10:00')).toBeInTheDocument()
  })

  it('counts down every second', () => {
    render(<AutoLockTimer />)
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(screen.getByText('auto-lock in 08:59')).toBeInTheDocument()
  })

  it('resets when activity is recorded', () => {
    render(<AutoLockTimer />)
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(screen.getByText('auto-lock in 08:00')).toBeInTheDocument()
    act(() => {
      useKavachStore.getState().recordActivity()
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByText('auto-lock in 09:59')).toBeInTheDocument()
  })

  it('uses the given prefix', () => {
    render(<AutoLockTimer prefix="auto-lock" />)
    expect(screen.getByText('auto-lock 10:00')).toBeInTheDocument()
  })
})
