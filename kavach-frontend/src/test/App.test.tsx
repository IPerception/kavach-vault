import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import { getVaultStatus } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'

vi.mock('../api/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auth')>()),
  getVaultStatus: vi.fn(),
}))

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App startup when the backend is unreachable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useKavachStore.setState({ status: 'loading' })
  })

  it('shows an error with a Retry button instead of an endless spinner', async () => {
    vi.mocked(getVaultStatus).mockRejectedValue(new Error('Network Error'))

    renderApp()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText("Can't reach Kavach")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('leaves the error screen once Retry reaches the backend', async () => {
    vi.mocked(getVaultStatus)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ initialized: false })

    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: /retry/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(getVaultStatus).toHaveBeenCalledTimes(2)
    expect(useKavachStore.getState().status).toBe('setup')
  })
})
