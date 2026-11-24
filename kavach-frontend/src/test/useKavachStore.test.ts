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

describe('useKavachStore colour mode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('adds html.dark and persists when set to dark', () => {
    useKavachStore.getState().setColorMode('dark')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('kavach_color_mode')).toBe('dark')
    expect(useKavachStore.getState().colorMode).toBe('dark')
  })

  it('removes html.dark and persists when set to light', () => {
    document.documentElement.classList.add('dark')

    useKavachStore.getState().setColorMode('light')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('kavach_color_mode')).toBe('light')
    expect(useKavachStore.getState().colorMode).toBe('light')
  })

  it('no longer has any theme state', () => {
    const state = useKavachStore.getState()

    expect(state).not.toHaveProperty('theme')
    expect(state).not.toHaveProperty('setTheme')
  })
})
