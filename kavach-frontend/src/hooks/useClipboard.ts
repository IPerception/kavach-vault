import { useState, useRef, useCallback } from 'react'

const CLIPBOARD_CLEAR_MS = 30_000

export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)

      if (clearTimer.current) clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(async () => {
        try {
          await navigator.clipboard.writeText('')
        } catch {
          // ignore — clipboard may have been overwritten by user
        }
        setCopied(false)
      }, CLIPBOARD_CLEAR_MS)
    } catch {
      setCopied(false)
    }
  }, [])

  return { copied, copy }
}
