import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../components/ui/Button'

describe('Button', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled while loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('renders the keyboard hint when kbd is set', () => {
    render(<Button kbd="N">New</Button>)
    expect(screen.getByText('N').tagName).toBe('KBD')
  })

  it('renders no hint by default', () => {
    const { container } = render(<Button>New</Button>)
    expect(container.querySelector('kbd')).toBeNull()
  })

  it('applies the variant and lets className override the size', () => {
    render(<Button variant="danger" className="h-10">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('text-weak-text', 'h-10')
    expect(button).not.toHaveClass('h-9')
  })
})
