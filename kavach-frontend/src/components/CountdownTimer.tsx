import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  seconds: number
  onExpire?: () => void
}

export function CountdownTimer({ seconds, onExpire }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds])

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.()
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onExpire])

  const pct = (remaining / seconds) * 100
  const color = remaining > 10 ? 'text-zinc-400' : 'text-red-400'

  return (
    <span className={`tabular-nums text-xs ${color}`}>
      {remaining}s
      <span className="ml-1 inline-block h-1.5 w-12 rounded-full bg-zinc-700 align-middle">
        <span
          className="block h-full rounded-full bg-kavach-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}
