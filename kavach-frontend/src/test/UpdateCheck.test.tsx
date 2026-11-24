import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UpdateCheck } from '../components/UpdateCheck'

vi.stubGlobal('__APP_VERSION__', '1.1.0')

describe('UpdateCheck', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the current version and does not contact GitHub on render', () => {
    render(<UpdateCheck />)

    expect(screen.getByText(/You are on Kavach 1\.1\.0/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('shows a download link when a newer release exists', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.2.0' }),
    } as Response)
    render(<UpdateCheck />)

    await userEvent.click(screen.getByRole('button', { name: /check for updates/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Kavach 1.2.0 is available.')
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      'https://github.com/IPerception/kavach-vault/releases',
    )
  })

  it('says so when already up to date', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.1.0' }),
    } as Response)
    render(<UpdateCheck />)

    await userEvent.click(screen.getByRole('button', { name: /check for updates/i }))

    expect(await screen.findByText('You have the latest version.')).toBeInTheDocument()
  })

  it('shows an error when GitHub cannot be reached', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    render(<UpdateCheck />)

    await userEvent.click(screen.getByRole('button', { name: /check for updates/i }))

    expect(await screen.findByText('Could not reach GitHub. Try again later.')).toBeInTheDocument()
  })
})
