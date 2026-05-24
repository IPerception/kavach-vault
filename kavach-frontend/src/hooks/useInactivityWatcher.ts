import { useEffect, useRef } from 'react'
import { useKavachStore } from '../store/useKavachStore'

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const CHECK_INTERVAL_MS = 30_000

export function useInactivityWatcher() {
  const { status, lastActivity, recordActivity, doLogout } = useKavachStore()
  const lockRef = useRef(doLogout)
  lockRef.current = doLogout

  useEffect(() => {
    if (status !== 'unlocked') return

    const handleActivity = () => recordActivity()
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }))

    const timer = setInterval(() => {
      if (Date.now() - useKavachStore.getState().lastActivity > INACTIVITY_TIMEOUT_MS) {
        lockRef.current()
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      clearInterval(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  return { lastActivity }
}
