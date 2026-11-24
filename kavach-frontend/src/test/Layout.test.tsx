import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { useKavachStore } from '../store/useKavachStore'
import { listCredentials, getHealthReport } from '../api/credentials'
import type { CredentialHealth, CredentialSummary } from '../api/types'

vi.stubGlobal('__APP_VERSION__', '9.9.9')

vi.mock('../api/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/credentials')>()),
  listCredentials: vi.fn(),
  getHealthReport: vi.fn(),
}))

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

function cred(id: number, over: Partial<CredentialSummary> = {}): CredentialSummary {
  return {
    id,
    purpose: `item ${id}`,
    credentialType: 'PASSWORD',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(1),
    ...over,
  }
}

function health(id: number, strengthScore: CredentialHealth['strengthScore']): CredentialHealth {
  return { id, purpose: `item ${id}`, strengthScore, strengthLabel: 'x', duplicate: false, updatedAt: daysAgo(1) }
}

// Link text is a label span plus a count span; jsdom has no CSS, so no space between them.
const withCount = (label: string, count: number) => new RegExp(`^${label}\\s*${count}$`)

function renderLayout(path = '/dashboard') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="dashboard" element={<p>dashboard screen</p>} />
            <Route path="health" element={<p>health screen</p>} />
            <Route path="audit" element={<p>audit screen</p>} />
            <Route path="settings" element={<p>settings screen</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useKavachStore.setState({ status: 'unlocked', colorMode: 'dark', doLogout: vi.fn() })
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { tags: ['work'] }), // weak
      cred(2, { tags: ['work', 'bank'], updatedAt: daysAgo(100) }), // stale
      cred(3), // healthy
      cred(4, { credentialType: 'NOTE', updatedAt: daysAgo(500) }), // note: ignored
    ])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, 1), health(2, 4), health(3, 4)])
  })

  it('renders the sidebar nav with the current page marked', async () => {
    renderLayout('/audit')
    const nav = screen.getByRole('navigation', { name: 'Vault sections' })

    expect(within(nav).getByRole('link', { name: 'Audit log' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: /^Vault/ })).not.toHaveAttribute('aria-current')
    expect(within(nav).getByRole('link', { name: /^Health/ })).toHaveAttribute('href', '/health')
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    expect(await screen.findByText('audit screen')).toBeInTheDocument()
  })

  it('shows the Health count as weak + stale passwords, each once, notes excluded', async () => {
    renderLayout()
    expect(await screen.findByRole('link', { name: withCount('Health', 2) })).toBeInTheDocument()
  })

  it('still counts stale passwords when the health report fails', async () => {
    vi.mocked(getHealthReport).mockRejectedValue(new Error('no session key'))
    renderLayout()
    expect(await screen.findByRole('link', { name: withCount('Vault', 4) })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: withCount('Health', 1) })).toBeInTheDocument()
  })

  it('lists tags with counts as links into the dashboard filter', async () => {
    renderLayout()
    const work = await screen.findByRole('link', { name: withCount('#work', 2) })
    expect(work).toHaveAttribute('href', '/dashboard?tag=work')
    expect(screen.getByRole('link', { name: withCount('#bank', 1) })).toHaveAttribute('href', '/dashboard?tag=bank')
  })

  it('marks the tag in the URL as current', async () => {
    renderLayout('/dashboard?tag=bank')
    expect(await screen.findByRole('link', { name: withCount('#bank', 1) })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: withCount('#work', 2) })).not.toHaveAttribute('aria-current')
  })

  it('Lock ends the session through doLogout', async () => {
    const doLogout = vi.fn()
    useKavachStore.setState({ doLogout })
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Lock' }))

    expect(doLogout).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('the mode toggle flips colorMode', async () => {
    renderLayout()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(useKavachStore.getState().colorMode).toBe('light')

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(useKavachStore.getState().colorMode).toBe('dark')
  })

  it('shows the status bar with the real origin and version', async () => {
    renderLayout()
    const footer = screen.getByRole('contentinfo')

    expect(within(footer).getByText('unlocked')).toBeInTheDocument()
    expect(within(footer).getByText('AES-256-GCM')).toBeInTheDocument()
    expect(within(footer).getByText('v9.9.9')).toBeInTheDocument()
    expect(within(footer).getByText(window.location.origin)).toBeInTheDocument()
    expect(within(footer).getByText('local only')).toBeInTheDocument()
    expect(await within(footer).findByText('4 items')).toBeInTheDocument()
  })

  it('shows the expiry banner on other screens but not on the dashboard', async () => {
    const { unmount } = renderLayout('/audit')
    expect(await screen.findByRole('link', { name: 'Review in Health' })).toBeInTheDocument()
    unmount()

    renderLayout('/dashboard')
    await screen.findByRole('link', { name: withCount('Health', 2) })
    expect(screen.queryByRole('link', { name: 'Review in Health' })).not.toBeInTheDocument()
  })
})
