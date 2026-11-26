import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LockScreen } from '../screens/LockScreen'
import { login } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  login: vi.fn(),
}))

function renderLock() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LockScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LockScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useKavachStore.setState({ status: 'locked', colorMode: 'dark' })
  })

  it('shows the gold banner, the locked badge and the trust footer', () => {
    renderLock()
    expect(screen.getByRole('img', { name: /Kavach/ })).toHaveAttribute('src', '/kavach-banner.webp')
    expect(screen.getByRole('heading', { name: 'Unlock vault' })).toBeInTheDocument()
    expect(screen.getByText('locked')).toBeInTheDocument()
    expect(screen.getByText('v0.0.0-test')).toBeInTheDocument()
    expect(screen.getByText('PBKDF2 600k + AES-256-GCM')).toBeInTheDocument()
    expect(screen.getByText('local only')).toBeInTheDocument()
    expect(document.querySelector('img[src*="Kavach-Logo"]')).toBeNull()
  })

  it('asks for the username only when none is stored', () => {
    renderLock()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  it('greets a stored user and hides the username field', () => {
    localStorage.setItem('kavach_username', 'prashu')
    renderLock()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.getByText('prashu')).toBeInTheDocument()
  })

  it('shows "Incorrect password" when login fails', async () => {
    localStorage.setItem('kavach_username', 'prashu')
    vi.mocked(login).mockRejectedValue(new Error('401'))
    renderLock()
    await userEvent.type(screen.getByLabelText('Master password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }))
    expect(await screen.findByText('Incorrect password')).toBeInTheDocument()
    expect(useKavachStore.getState().status).toBe('locked')
  })

  it('unlocks with the right password (Enter submits)', async () => {
    localStorage.setItem('kavach_username', 'prashu')
    vi.mocked(login).mockResolvedValue({} as never)
    renderLock()
    await userEvent.type(screen.getByLabelText('Master password'), 'right{Enter}')
    await waitFor(() => expect(useKavachStore.getState().status).toBe('unlocked'))
    expect(vi.mocked(login).mock.calls[0][0]).toEqual({ username: 'prashu', password: 'right' })
  })

  it('remembers the username after a successful unlock', async () => {
    vi.mocked(login).mockResolvedValue({} as never)
    renderLock()
    await userEvent.type(screen.getByLabelText('Username'), 'prashu')
    await userEvent.type(screen.getByLabelText('Master password'), 'right{Enter}')
    await waitFor(() => expect(useKavachStore.getState().status).toBe('unlocked'))
    expect(localStorage.getItem('kavach_username')).toBe('prashu')
  })

  it('does not remember a username when the unlock fails', async () => {
    vi.mocked(login).mockRejectedValue(new Error('401'))
    renderLock()
    await userEvent.type(screen.getByLabelText('Username'), 'someone')
    await userEvent.type(screen.getByLabelText('Master password'), 'wrong{Enter}')
    expect(await screen.findByText('Incorrect password')).toBeInTheDocument()
    expect(localStorage.getItem('kavach_username')).toBeNull()
  })

  it('switches colour mode from the corner toggle', async () => {
    renderLock()
    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(useKavachStore.getState().colorMode).toBe('light')
  })
})
