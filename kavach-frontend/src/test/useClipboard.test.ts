import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClipboard, CLIPBOARD_CLEAR_MS } from '../hooks/useClipboard'

describe('useClipboard', () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clears the clipboard after 30 s', async () => {
    const { result } = renderHook(() => useClipboard())
    await act(async () => { await result.current.copy('secret') })
    expect(result.current.copied).toBe(true)

    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS) })
    expect(writeText).toHaveBeenLastCalledWith('')
    expect(result.current.copied).toBe(false)
  })

  it('still clears after the copying component unmounts', async () => {
    const { result, unmount } = renderHook(() => useClipboard())
    await act(async () => { await result.current.copy('secret') })
    unmount()

    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS) })
    expect(writeText).toHaveBeenLastCalledWith('')
  })

  it('retries the clear when the window regains focus if the page was in the background', async () => {
    const { result } = renderHook(() => useClipboard())
    await act(async () => { await result.current.copy('secret') })

    // Window not focused when the timer fires: the browser rejects the write.
    writeText.mockRejectedValueOnce(new DOMException('Document is not focused.', 'NotAllowedError'))
    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS) })
    expect(writeText).toHaveBeenCalledTimes(2)

    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(writeText).toHaveBeenCalledTimes(3)
    expect(writeText).toHaveBeenLastCalledWith('')

    // Once cleared, later focus events do nothing.
    await act(async () => { window.dispatchEvent(new Event('focus')) })
    expect(writeText).toHaveBeenCalledTimes(3)
  })

  it('retries the clear on the next click or key press (Firefox needs a user gesture)', async () => {
    const { result } = renderHook(() => useClipboard())
    await act(async () => { await result.current.copy('secret') })

    writeText.mockRejectedValueOnce(new DOMException('Clipboard write was blocked.', 'NotAllowedError'))
    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS) })
    expect(writeText).toHaveBeenCalledTimes(2)

    // Still refused on the first gesture (e.g. a stray event): keeps waiting.
    writeText.mockRejectedValueOnce(new DOMException('Clipboard write was blocked.', 'NotAllowedError'))
    await act(async () => { document.body.dispatchEvent(new Event('keydown', { bubbles: true })) })
    expect(writeText).toHaveBeenCalledTimes(3)

    await act(async () => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
    expect(writeText).toHaveBeenCalledTimes(4)
    expect(writeText).toHaveBeenLastCalledWith('')

    await act(async () => { document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
    expect(writeText).toHaveBeenCalledTimes(4)
  })

  it('a new copy restarts the 30 s window', async () => {
    const { result } = renderHook(() => useClipboard())
    await act(async () => { await result.current.copy('first') })
    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS - 1000) })
    await act(async () => { await result.current.copy('second') })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(writeText).toHaveBeenLastCalledWith('second')

    await act(async () => { await vi.advanceTimersByTimeAsync(CLIPBOARD_CLEAR_MS) })
    expect(writeText).toHaveBeenLastCalledWith('')
  })
})
