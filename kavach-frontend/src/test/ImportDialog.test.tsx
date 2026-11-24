import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ImportDialog } from '../components/ImportDialog'
import { importCsv, importVault } from '../api/credentials'

vi.mock('../api/credentials', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/credentials')>()),
  importCsv: vi.fn(),
  importVault: vi.fn(),
}))

function renderDialog(onOpenChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <ImportDialog open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
  return { invalidate, onOpenChange }
}

describe('ImportDialog', () => {
  beforeEach(() => {
    vi.mocked(importCsv).mockReset()
    vi.mocked(importVault).mockReset()
  })

  it('sends a .csv file to importCsv and shows the result counts', async () => {
    vi.mocked(importCsv).mockResolvedValue({ imported: 3, skipped: 1 })
    const { invalidate } = renderDialog()
    const file = new File(['name,url\n'], 'logins.csv', { type: 'text/csv' })

    await userEvent.upload(screen.getByLabelText('Import file'), file)

    expect(await screen.findByText(/Import complete: 3 added, 1 skipped \(already exist\)\./)).toBeInTheDocument()
    expect(importCsv).toHaveBeenCalledWith(file)
    expect(importVault).not.toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['credentials'] })
  })

  it('sends a .json file to importVault', async () => {
    vi.mocked(importVault).mockResolvedValue({ imported: 2, skipped: 0 })
    renderDialog()
    const payload = { credentials: [] }
    const file = new File([JSON.stringify(payload)], 'export.json', { type: 'application/json' })

    await userEvent.upload(screen.getByLabelText('Import file'), file)

    expect(await screen.findByText(/Import complete: 2 added\./)).toBeInTheDocument()
    expect(importVault).toHaveBeenCalledWith(payload)
    expect(importCsv).not.toHaveBeenCalled()
  })

  it('shows an error for an unreadable JSON file', async () => {
    renderDialog()
    const file = new File(['not json'], 'export.json', { type: 'application/json' })

    await userEvent.upload(screen.getByLabelText('Import file'), file)

    await waitFor(() =>
      expect(screen.getByText('Could not read file. Make sure it is a valid Kavach export.')).toBeInTheDocument(),
    )
    expect(importVault).not.toHaveBeenCalled()
  })

  it('reports Done through onOpenChange(false)', async () => {
    vi.mocked(importCsv).mockResolvedValue({ imported: 1, skipped: 0 })
    const { onOpenChange } = renderDialog()
    await userEvent.upload(screen.getByLabelText('Import file'), new File(['x'], 'a.csv'))

    await userEvent.click(await screen.findByRole('button', { name: 'Done' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
