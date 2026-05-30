import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { isNewer, useUpdateCheck } from './useUpdateCheck'

// Vite injects __APP_VERSION__ at build time; stub it for tests.
vi.stubGlobal('__APP_VERSION__', '1.1.0')

describe('isNewer', () => {
  it('returns true when latest major is higher', () => {
    expect(isNewer('2.0.0', '1.9.9')).toBe(true)
  })
  it('returns true when latest minor is higher', () => {
    expect(isNewer('1.2.0', '1.1.9')).toBe(true)
  })
  it('returns true when latest patch is higher', () => {
    expect(isNewer('1.1.1', '1.1.0')).toBe(true)
  })
  it('returns false for equal versions', () => {
    expect(isNewer('1.1.0', '1.1.0')).toBe(false)
  })
  it('returns false when latest is older', () => {
    expect(isNewer('1.0.9', '1.1.0')).toBe(false)
  })
  it('strips leading v prefix', () => {
    expect(isNewer('v1.2.0', '1.1.0')).toBe(true)
  })
})

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns null initially and after fetch when version is current', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.1.0' }),
    } as Response)

    const { result } = renderHook(() => useUpdateCheck())

    expect(result.current).toBeNull()
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(result.current).toBeNull()
  })

  it('returns the newer version string when a newer release exists', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.2.0' }),
    } as Response)

    const { result } = renderHook(() => useUpdateCheck())

    await waitFor(() => expect(result.current).toBe('1.2.0'))
  })

  it('returns null when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useUpdateCheck())

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(result.current).toBeNull()
  })

  it('returns null when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useUpdateCheck())

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(result.current).toBeNull()
  })

  it('returns null when tag_name is missing from response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)

    const { result } = renderHook(() => useUpdateCheck())

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(result.current).toBeNull()
  })
})
