import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { scorePassword, PasswordStrengthMeter } from '../components/PasswordStrengthMeter'

describe('scorePassword', () => {
  it('returns score 0 for empty string', () => {
    expect(scorePassword('').score).toBe(0)
  })

  it('returns score 1 for 8-char lowercase-only password', () => {
    expect(scorePassword('abcdefgh').score).toBe(1)
  })

  it('returns score 2 for 12-char lowercase', () => {
    expect(scorePassword('abcdefghijkl').score).toBe(2)
  })

  it('returns score 3 when length >= 12 and has uppercase', () => {
    expect(scorePassword('abcdefghijkL').score).toBe(3)
  })

  it('returns score 4 when length >= 12, uppercase, and digits', () => {
    expect(scorePassword('abcdefghijL1').score).toBe(4)
  })

  it('clamps to 4 for very strong passwords', () => {
    expect(scorePassword('Abcdefghij1!').score).toBe(4)
  })

  it('returns correct label for each score', () => {
    expect(scorePassword('').label).toBe('Very Weak')
    expect(scorePassword('abcdefgh').label).toBe('Weak')
    expect(scorePassword('abcdefghijkl').label).toBe('Fair')
    expect(scorePassword('abcdefghijkL').label).toBe('Strong')
    expect(scorePassword('Abcdefghij1!').label).toBe('Very Strong')
  })
})

describe('PasswordStrengthMeter', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrengthMeter password="" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows strength label for a non-empty password', () => {
    render(<PasswordStrengthMeter password="abcdefgh" />)
    expect(screen.getByText('Weak')).toBeInTheDocument()
  })

  it('shows "Very Strong" label for a complex password', () => {
    render(<PasswordStrengthMeter password="Abcdefghij1!" />)
    expect(screen.getByText('Very Strong')).toBeInTheDocument()
  })

  it('has accessible aria-label', () => {
    render(<PasswordStrengthMeter password="abcdefgh" />)
    expect(screen.getByLabelText(/password strength/i)).toBeInTheDocument()
  })
})
