import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Settings } from '../screens/Settings'

vi.stubGlobal('__APP_VERSION__', '1.0.0')

vi.mock('../api/backup', () => ({
  getBackupDestination: vi.fn().mockResolvedValue({ destination: '' }),
  setBackupDestination: vi.fn(),
  clearBackupDestination: vi.fn(),
  runBackupNow: vi.fn(),
}))

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <Settings />
    </QueryClientProvider>,
  )
}

const DIALOGS = [
  { item: 'Change master password', title: 'Change master password' },
  { item: 'Authenticator app', title: 'Authenticator app' },
  { item: 'Import vault', title: 'Import vault' },
  { item: 'Backup destination', title: 'Backup destination' },
  { item: 'Password expiry', title: 'Password expiry' },
]

describe('Settings', () => {
  it.each(DIALOGS)('$item opens a dialog, shows no logo, and closes on Escape', async ({ item, title }) => {
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: new RegExp(item) }))

    const dialog = await screen.findByRole('dialog', { name: title })
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Kavach' })).not.toBeInTheDocument()
    expect(document.querySelector('img[src*="Kavach-Logo"]')).toBeNull()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
