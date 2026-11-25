import { describe, it, expect } from 'vitest'
import { hostOf, safeHref } from '../lib/url'

describe('safeHref', () => {
  it('links http and https URLs', () => {
    expect(safeHref('https://github.com/login')).toBe('https://github.com/login')
    expect(safeHref('http://router.local')).toBe('http://router.local/')
  })

  it('gives no href for a javascript: URL', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('  JavaScript:alert(1)')).toBeUndefined()
  })

  it('gives no href for other schemes, bare hosts, blanks and missing values', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined()
    expect(safeHref('file:///etc/passwd')).toBeUndefined()
    expect(safeHref('github.com')).toBeUndefined()
    expect(safeHref('   ')).toBeUndefined()
    expect(safeHref(null)).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
  })
})

describe('hostOf', () => {
  it('returns the hostname only', () => {
    expect(hostOf('https://mail.google.com/mail/u/0/#inbox')).toBe('mail.google.com')
    expect(hostOf('http://localhost:8080/x')).toBe('localhost')
  })

  it('reads a value without a scheme as https', () => {
    expect(hostOf('github.com/login')).toBe('github.com')
  })

  it('returns nothing for non-web schemes, blanks and missing values', () => {
    expect(hostOf('javascript:alert(1)')).toBeUndefined()
    expect(hostOf('')).toBeUndefined()
    expect(hostOf(null)).toBeUndefined()
  })
})
