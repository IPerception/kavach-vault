import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Outlet, useLocation } from 'react-router-dom'
import { PrivateRoutes } from '../App'
import { ItemDialog, useItemDialogClose } from '../components/ItemDialog'
import { itemLinkState } from '../lib/itemRoutes'

// Stub every screen: these tests are about which screen stays underneath which dialog,
// and where closing returns to. The real ItemDialog is used.
function Opener({ name, to }: { name: string; to: string }) {
  const location = useLocation()
  return (
    <div>
      <p>{name} screen</p>
      <Link to={to} state={itemLinkState(location)}>
        open {to}
      </Link>
    </div>
  )
}

function StubForm({ title }: { title: string }) {
  const close = useItemDialogClose()
  return (
    <ItemDialog title={title}>
      <button type="button" onClick={close}>
        Save
      </button>
    </ItemDialog>
  )
}

vi.mock('../components/Layout', () => ({ Layout: () => <Outlet /> }))
vi.mock('../screens/Dashboard', () => ({ Dashboard: () => <Opener name="dashboard" to="/add" /> }))
vi.mock('../screens/HealthReport', () => ({ HealthReport: () => <Opener name="health" to="/edit/7" /> }))
vi.mock('../screens/AuditLog', () => ({ AuditLog: () => <p>audit screen</p> }))
vi.mock('../screens/Settings', () => ({ Settings: () => <p>settings screen</p> }))
vi.mock('../screens/AddCredential', () => ({ AddCredential: () => <StubForm title="New item" /> }))
vi.mock('../screens/AddNote', () => ({ AddNote: () => <StubForm title="New note" /> }))
vi.mock('../screens/EditCredential', () => ({ EditCredential: () => <StubForm title="Edit item" /> }))
vi.mock('../screens/EditNote', () => ({ EditNote: () => <StubForm title="Edit note" /> }))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <PrivateRoutes />
    </MemoryRouter>,
  )
}

describe('item dialogs over the current screen', () => {
  it('New item opens over the vault, which stays rendered underneath', async () => {
    renderAt('/dashboard')
    await userEvent.click(screen.getByRole('link', { name: 'open /add' }))

    expect(await screen.findByRole('dialog', { name: 'New item' })).toBeInTheDocument()
    // getByText, not getByRole: Radix marks the background aria-hidden while a dialog is open.
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()
  })

  it('saving closes back to the vault', async () => {
    renderAt('/dashboard')
    await userEvent.click(screen.getByRole('link', { name: 'open /add' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'open /add' })).toBeInTheDocument()
  })

  it('Escape closes the dialog', async () => {
    renderAt('/dashboard')
    await userEvent.click(screen.getByRole('link', { name: 'open /add' }))
    await screen.findByRole('dialog', { name: 'New item' })

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()
  })

  it('clicking outside the dialog closes it', async () => {
    renderAt('/dashboard')
    await userEvent.click(screen.getByRole('link', { name: 'open /add' }))
    await screen.findByRole('dialog', { name: 'New item' })

    // Click the dim overlay behind the dialog, as a user would. Radix registers its
    // outside-pointer listener on the next tick after opening.
    await new Promise((r) => setTimeout(r, 0))
    const overlay = document.querySelector<HTMLElement>('div.inset-0[data-state="open"]')
    expect(overlay).not.toBeNull()
    await userEvent.click(overlay!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()
  })

  it('Edit opened from Health stays over Health and closes back to it', async () => {
    renderAt('/health')
    await userEvent.click(screen.getByRole('link', { name: 'open /edit/7' }))

    expect(await screen.findByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
    expect(screen.getByText('health screen')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('health screen')).toBeInTheDocument()
  })

  it('a direct load of an item URL shows the dialog over the vault and closes to it', async () => {
    renderAt('/edit/7')

    expect(await screen.findByRole('dialog', { name: 'Edit item' })).toBeInTheDocument()
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('dashboard screen')).toBeInTheDocument()
  })
})
