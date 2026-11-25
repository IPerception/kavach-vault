import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { EditCredential } from '../screens/EditCredential'
import { EditNote } from '../screens/EditNote'
import { listCredentials, deleteCredential } from '../api/credentials'
import type { CredentialSummary } from '../api/types'

vi.mock('../api/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/credentials')>()),
  listCredentials: vi.fn(),
  deleteCredential: vi.fn(),
}))

const base: CredentialSummary = {
  id: 7,
  purpose: 'GitHub',
  credentialType: 'PASSWORD',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderAt(path: string, items: CredentialSummary[]) {
  vi.mocked(listCredentials).mockResolvedValue(items)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/edit/:id" element={<EditCredential />} />
          <Route path="/edit-note/:id" element={<EditNote />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return invalidate
}

describe('Delete in the Edit dialogs', () => {
  beforeEach(() => {
    vi.mocked(deleteCredential).mockReset()
    vi.mocked(deleteCredential).mockResolvedValue({} as never)
  })

  it('confirms, calls the API, invalidates credentials and goes to the dashboard (credential)', async () => {
    const invalidate = renderAt('/edit/7', [base])
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete credential?' })
    expect(deleteCredential).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCredential).toHaveBeenCalledWith(7))
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['credentials'] })
  })

  it('does nothing when the confirm dialog is cancelled', async () => {
    renderAt('/edit/7', [base])
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete credential?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete credential?' })).not.toBeInTheDocument(),
    )
    // The Edit dialog itself stays open.
    expect(screen.getByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
    expect(deleteCredential).not.toHaveBeenCalled()
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument()
  })

  it('works the same way on a secure note', async () => {
    renderAt('/edit-note/7', [{ ...base, purpose: 'Wi-Fi', credentialType: 'NOTE' }])
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete note?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteCredential).toHaveBeenCalledWith(7))
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })
})
