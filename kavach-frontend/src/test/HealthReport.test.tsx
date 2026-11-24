import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HealthReport } from '../screens/HealthReport'
import { getHealthReport, checkBreaches } from '../api/credentials'
import type { CredentialHealth } from '../api/types'

vi.mock('../api/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/credentials')>()),
  getHealthReport: vi.fn(),
  checkBreaches: vi.fn(),
}))

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

function item(id: number, over: Partial<CredentialHealth> = {}): CredentialHealth {
  return {
    id,
    purpose: `item ${id}`,
    strengthScore: 4,
    strengthLabel: 'Very Strong',
    duplicate: false,
    updatedAt: daysAgo(1),
    ...over,
  }
}

function renderReport(items: CredentialHealth[]) {
  vi.mocked(getHealthReport).mockResolvedValue(items)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HealthReport />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Stat cards render the number and the label as sibling paragraphs.
function statValue(label: string) {
  return screen.getByText(label).previousElementSibling?.textContent
}

describe('HealthReport', () => {
  beforeEach(() => {
    vi.mocked(checkBreaches).mockReset()
    localStorage.clear()
  })

  it('counts weak, duplicate and stale passwords', async () => {
    renderReport([
      item(1, { strengthScore: 1, strengthLabel: 'Weak' }),
      item(2, { duplicate: true }),
      item(3, { duplicate: true, updatedAt: daysAgo(200) }),
      // updatedAt is old but the password itself changed recently: not stale.
      item(4, { updatedAt: daysAgo(400), passwordChangedAt: daysAgo(2) }),
      item(5),
    ])
    expect(await screen.findByText('total')).toBeInTheDocument()
    expect(statValue('total')).toBe('5')
    expect(statValue('weak')).toBe('1')
    expect(statValue('duplicates')).toBe('2')
    expect(statValue('stale >90d')).toBe('1')
    expect(screen.getByText('3 credentials need attention')).toBeInTheDocument()
  })

  it('shows the healthy state when nothing needs attention', async () => {
    renderReport([item(1), item(2)])
    expect(await screen.findByText('All credentials look healthy')).toBeInTheDocument()
  })

  it('asks for confirmation before the external breach check', async () => {
    vi.mocked(checkBreaches).mockResolvedValue([])
    renderReport([item(1)])
    await userEvent.click(await screen.findByRole('button', { name: /check breaches/i }))
    const dialog = await screen.findByRole('dialog', { name: 'External request required' })
    expect(checkBreaches).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(checkBreaches).toHaveBeenCalledTimes(1)
  })

  it('does not run the breach check when the dialog is cancelled', async () => {
    renderReport([item(1)])
    await userEvent.click(await screen.findByRole('button', { name: /check breaches/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(checkBreaches).not.toHaveBeenCalled()
  })
})
