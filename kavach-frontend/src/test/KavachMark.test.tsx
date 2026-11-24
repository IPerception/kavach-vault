import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KavachMark } from '../components/brand/KavachMark'

describe('KavachMark', () => {
  it('exposes an accessible name', () => {
    render(<KavachMark />)
    expect(screen.getByRole('img', { name: 'Kavach' })).toBeInTheDocument()
  })

  it('uses a custom title as the accessible name', () => {
    render(<KavachMark title="Kavach vault" />)
    expect(screen.getByRole('img', { name: 'Kavach vault' })).toBeInTheDocument()
  })

  it('is hidden from assistive tech when decorative', () => {
    const { container } = render(<KavachMark decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders at the requested pixel size', () => {
    const { container } = render(<KavachMark size={24} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('width', '24')
    expect(svg).toHaveAttribute('height', '24')
  })

  it('16 variant has no keyhole and a thicker outline', () => {
    const { container } = render(<KavachMark size={16} />)
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('path')).toHaveAttribute('stroke-width', '5')
  })

  it('24 variant has no keyhole dot', () => {
    const { container } = render(<KavachMark size={24} />)
    expect(container.querySelector('circle')).toBeNull()
  })

  it('32 variant has the keyhole but no traces', () => {
    const { container } = render(<KavachMark size={32} />)
    expect(container.querySelector('circle')).not.toBeNull()
    expect(container.querySelector('path[stroke="#B8924A"]')).toBeNull()
  })

  it('64 variant adds circuit traces', () => {
    const { container } = render(<KavachMark size={64} />)
    expect(container.querySelector('circle')).not.toBeNull()
    expect(container.querySelector('path[stroke="#B8924A"]')).not.toBeNull()
  })

  it('outline stroke follows the accent-line token', () => {
    const { container } = render(<KavachMark />)
    expect(container.querySelector('path')!.getAttribute('style')).toContain('var(--k-accent-line)')
  })
})
