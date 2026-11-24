import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { setNonce } = vi.hoisted(() => ({ setNonce: vi.fn() }))
vi.mock('get-nonce', () => ({ setNonce }))

function addMeta(content: string) {
  const meta = document.createElement('meta')
  meta.name = 'csp-nonce'
  meta.content = content
  document.head.appendChild(meta)
}

describe('cspNonce', () => {
  beforeEach(() => {
    vi.resetModules()
    setNonce.mockClear()
  })

  afterEach(() => {
    document.head.querySelectorAll('meta[name="csp-nonce"]').forEach((m) => m.remove())
  })

  it('passes the meta value to get-nonce', async () => {
    addMeta('abc123==')
    await import('../cspNonce')
    expect(setNonce).toHaveBeenCalledWith('abc123==')
  })

  it('ignores the unreplaced placeholder (Vite dev server)', async () => {
    addMeta('__CSP_NONCE__')
    await import('../cspNonce')
    expect(setNonce).not.toHaveBeenCalled()
  })

  it('ignores a missing tag', async () => {
    await import('../cspNonce')
    expect(setNonce).not.toHaveBeenCalled()
  })
})
