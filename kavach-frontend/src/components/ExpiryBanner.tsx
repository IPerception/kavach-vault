import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, X } from 'lucide-react'
import { useExpiryCheck } from '../hooks/useExpiryCheck'

export function ExpiryBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { expired, expiringSoon } = useExpiryCheck()

  if (dismissed || (expired.length === 0 && expiringSoon.length === 0)) return null

  const isUrgent = expired.length > 0

  const parts: string[] = []
  if (expired.length > 0)
    parts.push(`${expired.length} password${expired.length !== 1 ? 's' : ''} expired`)
  if (expiringSoon.length > 0)
    parts.push(`${expiringSoon.length} expiring soon`)

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 ${
        isUrgent
          ? 'border-red-500/30 bg-red-500/10'
          : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm ${
          isUrgent ? 'text-red-300' : 'text-amber-300'
        }`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
        <span>
          {parts.join(', ')}.{' '}
          <Link to="/health" className="underline hover:opacity-80">
            Review in Password Health
          </Link>
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss expiry notification"
        onClick={() => setDismissed(true)}
        className={`shrink-0 rounded p-0.5 hover:opacity-80 ${
          isUrgent ? 'text-red-400 hover:bg-red-500/20' : 'text-amber-400 hover:bg-amber-500/20'
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
