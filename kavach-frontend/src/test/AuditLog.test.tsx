import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuditLog } from '../screens/AuditLog'
import { getAuditLog } from '../api/auditLog'
import type { AuditLogEntry, Page } from '../api/types'

vi.mock('../api/auditLog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/auditLog')>()),
  getAuditLog: vi.fn(),
}))

const TOTAL = 45

function pageOf(number: number): Page<AuditLogEntry> {
  const start = number * 20
  const count = Math.min(20, TOTAL - start)
  return {
    content: Array.from({ length: count }, (_, i) => ({
      id: start + i + 1,
      action: 'VIEW',
      purpose: `entry ${start + i + 1}`,
      timestamp: '2026-11-01T10:00:00Z',
      ipAddress: null,
    })),
    totalElements: TOTAL,
    totalPages: 3,
    number,
  }
}

function renderLog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuditLog />
    </QueryClientProvider>,
  )
}

describe('AuditLog', () => {
  beforeEach(() => {
    vi.mocked(getAuditLog).mockReset()
    vi.mocked(getAuditLog).mockImplementation(async (page = 0) => pageOf(page))
  })

  it('shows the first page of server data', async () => {
    renderLog()
    expect(await screen.findByText('Showing 1-20 of 45')).toBeInTheDocument()
    expect(getAuditLog).toHaveBeenCalledWith(0)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('requests the next server page on Next', async () => {
    renderLog()
    await screen.findByText('Showing 1-20 of 45')
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Showing 21-40 of 45')).toBeInTheDocument()
    expect(vi.mocked(getAuditLog).mock.calls.map((c) => c[0])).toEqual([0, 1])
  })

  it('disables Next and Last on the final page', async () => {
    renderLog()
    await screen.findByText('Showing 1-20 of 45')
    await userEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(await screen.findByText('Showing 41-45 of 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})
