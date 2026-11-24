import { describe, it, expect } from 'vitest'
import { cn } from '../components/ui/cn'

describe('cn', () => {
  it('keeps a custom font size next to a token text colour', () => {
    expect(cn('text-2xs', 'text-soft').split(' ').sort()).toEqual(['text-2xs', 'text-soft'])
    expect(cn('text-soft', 'text-2xs').split(' ').sort()).toEqual(['text-2xs', 'text-soft'])
  })

  it('keeps a default font size next to a token text colour', () => {
    expect(cn('text-lg', 'text-text').split(' ').sort()).toEqual(['text-lg', 'text-text'])
  })

  it('still lets a later colour or size override an earlier one', () => {
    expect(cn('text-soft', 'text-muted')).toBe('text-muted')
    expect(cn('text-2xs', 'text-xs')).toBe('text-xs')
  })

  it('merges the custom radius and shadow tokens', () => {
    expect(cn('rounded-panel', 'rounded-control')).toBe('rounded-control')
    expect(cn('shadow-surface', 'shadow-none')).toBe('shadow-none')
  })
})
