import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from '../components/ui/IconButton'
import { TooltipProvider } from '../components/ui/Tooltip'

function setup() {
  return render(
    <TooltipProvider>
      <IconButton label="Copy username"><svg aria-hidden="true" /></IconButton>
    </TooltipProvider>,
  )
}

describe('IconButton', () => {
  it('uses the label as its accessible name', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Copy username' })).toBeInTheDocument()
  })

  it('is a non-submitting button by default', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Copy username' })).toHaveAttribute('type', 'button')
  })

  it('shows the tooltip when focused', async () => {
    setup()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Copy username' })).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Copy username')
  })

  it('works without a TooltipProvider above it', () => {
    render(<IconButton label="Lock"><svg aria-hidden="true" /></IconButton>)
    expect(screen.getByRole('button', { name: 'Lock' })).toBeInTheDocument()
  })

  it('shows no tooltip with tooltip={false} but keeps the accessible name', async () => {
    render(<IconButton label="Close" tooltip={false}><svg aria-hidden="true" /></IconButton>)
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
