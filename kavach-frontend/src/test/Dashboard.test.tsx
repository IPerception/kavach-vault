import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Dashboard } from '../screens/Dashboard'
import { listCredentials, getHealthReport, toggleFavourite } from '../api/credentials'
import type { CredentialHealth, CredentialSummary } from '../api/types'

vi.mock('../api/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/credentials')>()),
  listCredentials: vi.fn(),
  getHealthReport: vi.fn(),
  toggleFavourite: vi.fn(),
}))

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

function cred(id: number, over: Partial<CredentialSummary> = {}): CredentialSummary {
  return {
    id,
    purpose: `Item ${id}`,
    username: `user${id}@example.com`,
    credentialType: 'PASSWORD',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(2),
    ...over,
  }
}

function health(id: number, strengthScore: CredentialHealth['strengthScore']): CredentialHealth {
  return { id, purpose: `Item ${id}`, strengthScore, strengthLabel: 'x', duplicate: false, updatedAt: daysAgo(2) }
}

function renderDashboard(path = '/dashboard') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add" element={<p>add screen</p>} />
          <Route path="/health" element={<p>health screen</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const rowOf = (name: string) => screen.getByRole('link', { name }).closest('li') as HTMLElement
const manyItems = (n: number) =>
  Array.from({ length: n }, (_, i) => cred(i + 1, { purpose: `Item ${String(i + 1).padStart(2, '0')}` }))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.mocked(listCredentials).mockResolvedValue([])
    vi.mocked(getHealthReport).mockResolvedValue([])
    vi.mocked(toggleFavourite).mockResolvedValue(undefined as never)
  })

  it('orders the chips website, strength, then tags, with the rest of the tags behind +N', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'GitHub', url: 'https://github.com/login', tags: ['work', 'dev', 'ops', 'ci'] }),
    ])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, 4)])
    renderDashboard()

    await screen.findByRole('link', { name: 'GitHub' })
    const row = rowOf('GitHub')
    await within(row).findByText('Strong')

    const text = row.textContent ?? ''
    const order = ['github.com', 'Strong', '#work', '#dev', '+2'].map((s) => text.indexOf(s))
    expect(order.every((i) => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(within(row).getByRole('link', { name: /github\.com/ })).toHaveAttribute('href', 'https://github.com/login')
    // the two hidden tags are only reachable through the +N chip
    expect(within(row).queryByText('#ops')).not.toBeInTheDocument()
    expect(within(row).getByText(/more tags: #ops, #ci/)).toBeInTheDocument()
  })

  it.each([
    [0, 'Weak'],
    [2, 'Fair'],
    [3, 'Strong'],
  ] as const)('shows strength score %i as %s', async (score, word) => {
    vi.mocked(listCredentials).mockResolvedValue([cred(1, { purpose: 'Bank' })])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, score)])
    renderDashboard()
    await screen.findByRole('link', { name: 'Bank' })
    expect(await within(rowOf('Bank')).findByText(word)).toBeInTheDocument()
  })

  it('notes have no copy-username button, no strength chip and no website chip', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'Wi-Fi', credentialType: 'NOTE', username: undefined, url: 'https://example.com' }),
    ])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, 0)])
    renderDashboard()

    await screen.findByRole('link', { name: 'Wi-Fi' })
    const row = rowOf('Wi-Fi')
    expect(within(row).getByText('NOTE')).toBeInTheDocument()
    expect(within(row).getByText('Secure note')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /copy username/i })).not.toBeInTheDocument()
    expect(within(row).queryByText(/^(weak|fair|strong)$/i)).not.toBeInTheDocument()
    expect(within(row).queryByText('example.com')).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Reveal Wi-Fi with authenticator code' })).toBeInTheDocument()
  })

  it('has no Edit or Delete on the row; the name links to the edit route', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'GitHub' }),
      cred(2, { purpose: 'Notes', credentialType: 'NOTE' }),
    ])
    renderDashboard()

    expect(await screen.findByRole('link', { name: 'GitHub' })).toHaveAttribute('href', '/edit/1')
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '/edit-note/2')
    expect(screen.queryByRole('button', { name: /delete|edit/i })).not.toBeInTheDocument()
  })

  it('does not link a javascript: URL', async () => {
    vi.mocked(listCredentials).mockResolvedValue([cred(1, { purpose: 'Evil', url: 'javascript:alert(1)' })])
    renderDashboard()
    await screen.findByRole('link', { name: 'Evil' })
    const row = rowOf('Evil')
    expect(within(row).getAllByRole('link')).toHaveLength(1) // just the name
    expect(row.innerHTML).not.toContain('javascript:')
  })

  it('shows the password age, not the edit date, and marks a stale password', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'Old pw', updatedAt: daysAgo(1), passwordChangedAt: daysAgo(150) }),
      cred(2, { purpose: 'Fresh pw', updatedAt: daysAgo(1), passwordChangedAt: daysAgo(3) }),
      cred(3, { purpose: 'Old note', credentialType: 'NOTE', updatedAt: daysAgo(400) }),
    ])
    renderDashboard()
    await screen.findByRole('link', { name: 'Old pw' })

    expect(within(rowOf('Old pw')).getByText('5mo ago')).toHaveClass('text-fair-text')
    expect(within(rowOf('Fresh pw')).getByText('3d ago')).not.toHaveClass('text-fair-text')
    expect(within(rowOf('Old note')).getByText('1y ago')).not.toHaveClass('text-fair-text')
  })

  it('counts need attention from the shared summary and links to Health', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1), // weak
      cred(2, { passwordChangedAt: daysAgo(100) }), // stale
      cred(3),
      cred(4, { credentialType: 'NOTE', updatedAt: daysAgo(500) }), // note: ignored
    ])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, 1), health(2, 4), health(3, 4)])
    renderDashboard()

    const link = await screen.findByRole('link', { name: /2\s*need attention: 1 weak, 1 unchanged for 90\+ days/ })
    expect(link).toHaveAttribute('href', '/health')
    expect(link).toHaveClass('bg-warn-bg')
  })

  it('uses warn tokens only when something needs attention', async () => {
    vi.mocked(listCredentials).mockResolvedValue([cred(1)])
    vi.mocked(getHealthReport).mockResolvedValue([health(1, 4)])
    renderDashboard()
    const link = await screen.findByRole('link', { name: /need attention/ })
    expect(link).not.toHaveClass('bg-warn-bg')
  })

  it('shows filter counts and switches the list with aria-pressed buttons', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'GitHub', favourite: true }),
      cred(2, { purpose: 'Gmail' }),
      cred(3, { purpose: 'Wi-Fi', credentialType: 'NOTE' }),
    ])
    renderDashboard()
    await screen.findByRole('link', { name: 'GitHub' })

    const group = screen.getByRole('group', { name: 'Filter items' })
    expect(within(group).getByRole('button', { name: /^All\s*3$/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /^Favourites\s*1$/ })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /^Passwords\s*2$/ })).toBeInTheDocument()
    expect(within(group).getByRole('button', { name: /^Notes\s*1$/ })).toBeInTheDocument()

    await userEvent.click(within(group).getByRole('button', { name: /^Notes/ }))
    expect(within(group).getByRole('button', { name: /^Notes/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('link', { name: 'Wi-Fi' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
  })

  it('paginates 30 items to "Showing 26-30 of 30"', async () => {
    vi.mocked(listCredentials).mockResolvedValue(manyItems(30))
    renderDashboard()
    expect(await screen.findByText('Showing 1-25 of 30')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Item 26' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('Showing 26-30 of 30')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Item 26' })).toBeInTheDocument()
  })

  it('a search resets to page 1', async () => {
    vi.mocked(listCredentials).mockResolvedValue(manyItems(30))
    renderDashboard()
    await screen.findByText('Showing 1-25 of 30')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Showing 26-30 of 30')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search vault' }), 'Item 1')

    // Item 10-19 = 10 matches, shown from page 1
    expect(screen.getByText('Showing 1-10 of 10')).toBeInTheDocument()
  })

  it('a filter change resets to page 1', async () => {
    vi.mocked(listCredentials).mockResolvedValue(manyItems(30))
    renderDashboard()
    await screen.findByText('Showing 1-25 of 30')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    await userEvent.click(screen.getByRole('button', { name: /^Passwords/ }))
    expect(screen.getByText('Showing 1-25 of 30')).toBeInTheDocument()
  })

  it('search matches tags, with or without a leading #', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'GitHub', tags: ['work'] }),
      cred(2, { purpose: 'Gmail', tags: ['personal'] }),
    ])
    renderDashboard()
    await screen.findByRole('link', { name: 'GitHub' })
    const box = screen.getByRole('searchbox', { name: 'Search vault' })
    expect(box).toHaveAttribute('placeholder', 'Search name, username, website or #tag')

    await userEvent.type(box, '#work')
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()

    await userEvent.clear(box)
    await userEvent.type(box, 'personal')
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'GitHub' })).not.toBeInTheDocument()
  })

  it('Ctrl+K focuses the search box', async () => {
    renderDashboard()
    const box = await screen.findByRole('searchbox', { name: 'Search vault' })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(box).toHaveFocus()
  })

  // The New item button and the N shortcut live in the sidebar now: see Layout.test.

  it('Escape clears the search', async () => {
    renderDashboard()
    const box = await screen.findByRole('searchbox', { name: 'Search vault' })
    await userEvent.type(box, 'git')
    expect(box).toHaveValue('git')
    await userEvent.keyboard('{Escape}')
    expect(box).toHaveValue('')
  })

  it('a ?tag= param filters the list and can be cleared', async () => {
    vi.mocked(listCredentials).mockResolvedValue([
      cred(1, { purpose: 'GitHub', tags: ['work'] }),
      cred(2, { purpose: 'Gmail', tags: ['personal'] }),
    ])
    renderDashboard('/dashboard?tag=work')
    await screen.findByRole('link', { name: 'GitHub' })
    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Clear tag filter #work' }))
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('still renders the rows, without strength, when the health report fails', async () => {
    vi.mocked(listCredentials).mockResolvedValue([cred(1, { purpose: 'GitHub', url: 'https://github.com' })])
    vi.mocked(getHealthReport).mockRejectedValue(new Error('no session key'))
    renderDashboard()

    await screen.findByRole('link', { name: 'GitHub' })
    await vi.waitFor(() => expect(getHealthReport).toHaveBeenCalled())
    const row = rowOf('GitHub')
    expect(within(row).getByText('github.com')).toBeInTheDocument()
    expect(within(row).queryByText(/^(weak|fair|strong)$/i)).not.toBeInTheDocument()
  })

  it('the favourite star toggles through the API and reports its state', async () => {
    vi.mocked(listCredentials).mockResolvedValue([cred(7, { purpose: 'GitHub' })])
    renderDashboard()
    const star = await screen.findByRole('button', { name: 'Add GitHub to favourites' })
    expect(star).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(star)

    expect(vi.mocked(toggleFavourite).mock.calls[0][0]).toBe(7)
  })

  it('copies the username from a row and from the favourites strip', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    vi.mocked(listCredentials).mockResolvedValue([cred(1, { purpose: 'GitHub', username: 'octo', favourite: true })])
    renderDashboard()
    await screen.findByRole('link', { name: 'GitHub' })

    const buttons = screen.getAllByRole('button', { name: 'Copy username for GitHub' })
    expect(buttons).toHaveLength(2) // strip pill + row
    await act(async () => {
      fireEvent.click(buttons[0])
    })
    await act(async () => {
      fireEvent.click(buttons[1])
    })
    expect(writeText).toHaveBeenCalledTimes(2)
    expect(writeText).toHaveBeenCalledWith('octo')
  })

  it('opens the import dialog from Import CSV', async () => {
    renderDashboard()
    await userEvent.click(await screen.findByRole('button', { name: 'Import CSV' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('shows the empty state for an empty vault', async () => {
    renderDashboard()
    expect(await screen.findByText('Your vault is empty')).toBeInTheDocument()
  })
})
