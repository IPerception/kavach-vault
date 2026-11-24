import { strengthBucket } from '../lib/attention'

interface PasswordStrengthMeterProps {
  password: string
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
}

export function scorePassword(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong']
  const barColors = { weak: 'bg-weak-bar', fair: 'bg-fair-bar', strong: 'bg-ok-bar' }
  return { score: clamped, label: labels[clamped], color: barColors[strengthBucket(clamped)] }
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null
  const { score, label, color } = scorePassword(password)
  const widthPct = ((score + 1) / 5) * 100

  return (
    <div className="mt-2 space-y-1.5" aria-label={`Password strength: ${label}`}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-track">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${widthPct}%` }}
        />
        {/* Segment dividers */}
        <div className="pointer-events-none absolute inset-0 flex">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ left: `${i * 25}%` }} className="absolute h-full w-px bg-panel" />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">
        Strength: <span className="font-medium text-text">{label}</span>
      </p>
    </div>
  )
}
