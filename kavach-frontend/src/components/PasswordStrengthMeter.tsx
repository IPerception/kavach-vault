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
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500']
  return { score: clamped, label: labels[clamped], color: colors[clamped] }
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null
  const { score, label, color } = scorePassword(password)
  const widthPct = ((score + 1) / 5) * 100

  return (
    <div className="mt-2 space-y-1.5" aria-label={`Password strength: ${label}`}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${widthPct}%` }}
        />
        {/* Segment dividers */}
        <div className="pointer-events-none absolute inset-0 flex">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ left: `${i * 25}%` }} className="absolute h-full w-px bg-zinc-900" />
          ))}
        </div>
      </div>
      <p className="text-xs text-zinc-400">
        Strength: <span className="font-medium text-zinc-200">{label}</span>
      </p>
    </div>
  )
}
