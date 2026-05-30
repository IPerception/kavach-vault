import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInactivityWatcher } from '../hooks/useInactivityWatcher'
import { useKavachStore } from '../store/useKavachStore'

vi.mock('../store/useKavachStore')

const mockLock = vi.fn()
const mockRecordActivity = vi.fn()

function setupStoreMock(overrides: { status?: string; lastActivity?: number } = {}) {
  const state = {
    status: overrides.status ?? 'unlocked',
    lastActivity: overrides.lastActivity ?? Date.now(),
    lock: vi.fn(),
    doLogout: mockLock,
    recordActivity: mockRecordActivity,
    setStatus: vi.fn(),
    unlock: vi.fn(),
    setColorMode: vi.fn(),
  }
  vi.mocked(useKavachStore).mockReturnValue(state as ReturnType<typeof useKavachStore>)
  // useKavachStore.getState() is called inside the interval callback
  ;(useKavachStore as unknown as { getState: () => typeof state }).getState = vi.fn().mockReturnValue(state)
  return state
}

describe('useInactivityWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setupStoreMock()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('registers activity event listeners on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useInactivityWatcher())
    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })
    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
  })

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useInactivityWatcher())
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('does not set up listeners when vault is not unlocked', () => {
    setupStoreMock({ status: 'locked' })
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useInactivityWatcher())
    expect(addSpy).not.toHaveBeenCalled()
  })

  it('calls lock when inactivity timeout expires', () => {
    const staleActivity = Date.now() - 11 * 60 * 1000
    setupStoreMock({ lastActivity: staleActivity })

    renderHook(() => useInactivityWatcher())

    act(() => {
      vi.advanceTimersByTime(31_000)
    })

    expect(mockLock).toHaveBeenCalled()
  })
})
