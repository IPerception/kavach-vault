import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ClipboardCopy } from '../components/ClipboardCopy'

describe('ClipboardCopy', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders copy button with default label', () => {
    render(<ClipboardCopy text="secret" />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('renders copy button with custom label', () => {
    render(<ClipboardCopy text="secret" label="Copy password" />)
    expect(screen.getByRole('button', { name: /copy password/i })).toBeInTheDocument()
  })

  it('calls clipboard.writeText with the provided text on click', async () => {
    render(<ClipboardCopy text="my-secret-password" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my-secret-password')
  })

  it('shows "Copied!" after clicking', async () => {
    render(<ClipboardCopy text="secret" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })
})
