import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useExpiryCheck } from '../hooks/useExpiryCheck'
import { IconButton } from './ui/IconButton'
import { cn } from './ui/cn'

export function ExpiryBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { pathname } = useLocation()
  const { expired, expiringSoon } = useExpiryCheck()

  // The dashboard's summary strip carries the same signal.
  if (pathname === '/dashboard') return null
  if (dismissed || (expired.length === 0 && expiringSoon.length === 0)) return null

  const isUrgent = expired.length > 0

  const parts: string[] = []
  if (expired.length > 0)
    parts.push(`${expired.length} password${expired.length !== 1 ? 's' : ''} expired`)
  if (expiringSoon.length > 0)
    parts.push(`${expiringSoon.length} expiring soon`)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-panel border px-4 py-2',
        isUrgent ? 'border-weak-bar/40 bg-weak-bar/10' : 'border-warn-border bg-warn-bg',
      )}
    >
      <div className={cn('flex items-center gap-2 text-sm', isUrgent ? 'text-weak-text' : 'text-warn-text')}>
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {parts.join(', ')}.{' '}
          <Link to="/health" className="underline hover:opacity-80">
            Review in Health
          </Link>
        </span>
      </div>
      <IconButton
        label="Dismiss expiry notification"
        tooltip={false}
        className={isUrgent ? 'text-weak-text' : 'text-warn-text'}
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
    </div>
  )
}
