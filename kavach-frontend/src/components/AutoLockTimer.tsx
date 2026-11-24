import { useEffect, useState } from 'react'
import { useKavachStore } from '../store/useKavachStore'
import { INACTIVITY_TIMEOUT_MS } from '../hooks/useInactivityWatcher'

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

interface AutoLockTimerProps {
  /** Text before the countdown, e.g. "auto-lock in". */
  prefix?: string
  className?: string
}

// Owns its 1 s tick so only this span re-renders, not the whole layout.
export function AutoLockTimer({ prefix = 'auto-lock in', className }: AutoLockTimerProps) {
  const lastActivity = useKavachStore((s) => s.lastActivity)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Clamp: activity can land between ticks, which would make `now` older than lastActivity.
  const remaining = Math.min(INACTIVITY_TIMEOUT_MS, INACTIVITY_TIMEOUT_MS - (now - lastActivity))

  return (
    <span className={className}>
      {prefix} {formatRemaining(remaining)}
    </span>
  )
}
