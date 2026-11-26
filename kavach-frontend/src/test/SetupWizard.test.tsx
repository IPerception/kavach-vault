import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SetupWizard } from '../screens/SetupWizard'
import { register, login, setupTotp, confirmTotp } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  register: vi.fn(),
  login: vi.fn(),
  setupTotp: vi.fn(),
  confirmTotp: vi.fn(),
}))

const SECRET = 'ABCDEF123456'

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <SetupWizard />
    </QueryClientProvider>,
  )
}

async function fillRegistration() {
  await userEvent.type(screen.getByLabelText('Username'), 'prashu')
  await userEvent.type(screen.getByLabelText('Email'), 'me@example.com')
  await userEvent.type(screen.getByLabelText('Master password'), 'Str0ng!Passphrase')
  await userEvent.type(screen.getByLabelText('Confirm password'), 'Str0ng!Passphrase')
  await userEvent.click(screen.getByRole('button', { name: 'Create vault' }))
}

describe('SetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useKavachStore.setState({ status: 'setup' })
    vi.mocked(register).mockResolvedValue({} as never)
    vi.mocked(login).mockResolvedValue({} as never)
    vi.mocked(setupTotp).mockResolvedValue({ secret: SECRET, qrCodeUri: `otpauth://totp/Kavach:prashu?secret=${SECRET}` })
  })

  it('step 1 shows the banner and the vault form', () => {
    renderWizard()
    expect(screen.getByRole('img', { name: /Kavach/ })).toHaveAttribute('src', '/kavach-banner.webp')
    expect(screen.getByRole('heading', { name: 'Create your vault' })).toBeInTheDocument()
    expect(screen.getByText('v0.0.0-test')).toBeInTheDocument()
  })

  it('goes to the authenticator step after creating the vault', async () => {
    renderWizard()
    await fillRegistration()

    expect(await screen.findByRole('heading', { name: 'Set up authenticator' })).toBeInTheDocument()
    expect(vi.mocked(register).mock.calls[0][0]).toEqual({
      username: 'prashu',
      email: 'me@example.com',
      password: 'Str0ng!Passphrase',
    })
    expect(screen.getByText(SECRET)).toBeInTheDocument()
  })

  it('opens the vault once the first code is confirmed', async () => {
    vi.mocked(confirmTotp).mockResolvedValue({} as never)
    renderWizard()
    await fillRegistration()

    await userEvent.type(await screen.findByLabelText('6-digit code from your app'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and open vault' }))

    await waitFor(() => expect(useKavachStore.getState().status).toBe('unlocked'))
    expect(vi.mocked(confirmTotp).mock.calls[0][0]).toBe('123456')
    expect(localStorage.getItem('kavach_username')).toBe('prashu')
  })

  it('shows an error for a wrong code and stays on the step', async () => {
    vi.mocked(confirmTotp).mockRejectedValue(new Error('400'))
    renderWizard()
    await fillRegistration()

    await userEvent.type(await screen.findByLabelText('6-digit code from your app'), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and open vault' }))

    expect(await screen.findByText(/Invalid code/)).toBeInTheDocument()
    expect(useKavachStore.getState().status).toBe('setup')
  })
})
