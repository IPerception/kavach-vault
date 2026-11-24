import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
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

  function respond(body: object, ok = true) {
    vi.mocked(fetch).mockResolvedValue({ ok, json: async () => body } as Response)
  }

  async function renderAndCheck() {
    const hook = renderHook(() => useUpdateCheck())
    await act(() => hook.result.current.check())
    return hook.result
  }

  it('does not contact GitHub until check() is called', () => {
    const { result } = renderHook(() => useUpdateCheck())

    expect(fetch).not.toHaveBeenCalled()
    expect(result.current.status).toEqual({ state: 'idle' })
  })

  it('reports current when the latest release is this version', async () => {
    respond({ tag_name: 'v1.1.0' })

    const result = await renderAndCheck()

    expect(fetch).toHaveBeenCalledOnce()
    expect(result.current.status).toEqual({ state: 'current' })
  })

  it('reports the newer version when one exists', async () => {
    respond({ tag_name: 'v1.2.0' })

    const result = await renderAndCheck()

    expect(result.current.status).toEqual({ state: 'available', version: '1.2.0' })
  })

  it('reports an error when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    const result = await renderAndCheck()

    expect(result.current.status).toEqual({ state: 'error' })
  })

  it('reports an error when the response is not ok', async () => {
    respond({}, false)

    const result = await renderAndCheck()

    expect(result.current.status).toEqual({ state: 'error' })
  })

  it('reports an error when tag_name is missing from the response', async () => {
    respond({})

    const result = await renderAndCheck()

    expect(result.current.status).toEqual({ state: 'error' })
  })
})
