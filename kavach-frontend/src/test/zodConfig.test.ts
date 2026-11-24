import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import '../zodConfig'

describe('zodConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('turns on jitless', () => {
    expect(z.config().jitless).toBe(true)
  })

  it('never calls the Function constructor, which the CSP blocks', () => {
    const fn = vi.spyOn(globalThis, 'Function')
    const schema = z.object({ name: z.string(), age: z.number() })

    expect(schema.parse({ name: 'a', age: 1 })).toEqual({ name: 'a', age: 1 })
    expect(schema.safeParse({ name: 'a', age: 'x' }).success).toBe(false)
    expect(fn).not.toHaveBeenCalled()
  })
})
