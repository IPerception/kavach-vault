import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logout } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  logout: vi.fn(),
}))

describe('useKavachStore lock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKavachStore.setState({ status: 'unlocked' })
  })

  it('ends the server session so the master key is zeroed', async () => {
    vi.mocked(logout).mockResolvedValue({} as Awaited<ReturnType<typeof logout>>)

    await useKavachStore.getState().lock()

    expect(logout).toHaveBeenCalledTimes(1)
    expect(useKavachStore.getState().status).toBe('locked')
  })

  it('still locks the client when the logout call fails', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('Network Error'))

    await useKavachStore.getState().lock()

    expect(useKavachStore.getState().status).toBe('locked')
  })
})
