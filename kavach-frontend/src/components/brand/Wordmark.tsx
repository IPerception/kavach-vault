import { KavachMark, type KavachMarkSize } from './KavachMark'

interface WordmarkProps {
  size?: KavachMarkSize
  className?: string
}

export function Wordmark({ size = 32, className }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`.trim()}>
      <KavachMark size={size} decorative />
      <span className="font-display text-2xl font-semibold text-accent-line">Kavach</span>
    </span>
  )
}
