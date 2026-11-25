import { useState, useRef, useCallback, useEffect } from 'react'

export const CLIPBOARD_CLEAR_MS = 30_000

// A page cannot always write the clipboard from a timer:
// - Firefox only allows clipboard writes during a user gesture (click, key press), so a
//   write from setTimeout is always rejected.
// - Chromium allows it only while the document has focus; a user who copied a password
//   has usually switched to another app to paste it.
// So the timer tries once, and if that is refused the clear is retried on the next user
// gesture in Kavach (pointerdown/keydown carry user activation) or when the window regains
// focus (enough for Chromium). Listeners are capture phase so they run before the gesture's
// own handlers, e.g. a fresh Copy click re-fills the clipboard after this clears it.
//
// Module level, not per hook: the copy button lives in the reveal dialog, which closes
// (unmounts) long before 30 s are up, and the pending clear must survive that.
let clearTimer: ReturnType<typeof setTimeout> | null = null
let waitingForRetry = false

const RETRY_EVENTS = ['pointerdown', 'keydown', 'focus'] as const

function onRetryEvent() {
  void clearClipboard()
}

function stopWaiting() {
  if (waitingForRetry) {
    for (const type of RETRY_EVENTS) window.removeEventListener(type, onRetryEvent, true)
    waitingForRetry = false
  }
}

async function clearClipboard() {
  try {
    await navigator.clipboard.writeText('')
    stopWaiting()
  } catch {
    if (!waitingForRetry) {
      waitingForRetry = true
      for (const type of RETRY_EVENTS) window.addEventListener(type, onRetryEvent, true)
    }
  }
}

function scheduleClear() {
  if (clearTimer) clearTimeout(clearTimer)
  stopWaiting()
  clearTimer = setTimeout(() => {
    clearTimer = null
    void clearClipboard()
  }, CLIPBOARD_CLEAR_MS)
}

export function useClipboard() {
  const [copied, setCopied] = useState(false)
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (labelTimer.current) clearTimeout(labelTimer.current)
  }, [])

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      scheduleClear()
      if (labelTimer.current) clearTimeout(labelTimer.current)
      labelTimer.current = setTimeout(() => setCopied(false), CLIPBOARD_CLEAR_MS)
    } catch {
      setCopied(false)
    }
  }, [])

  return { copied, copy }
}
