import { KavachMark, type KavachMarkSize } from './KavachMark'
import { cn } from '../ui/cn'

interface WordmarkProps {
  size?: KavachMarkSize
  className?: string
  /** Classes for the "Kavach" name, e.g. a smaller text size in the sidebar. */
  nameClassName?: string
  /** Optional line under the name. Real text, not an image: stays sharp and follows the theme. */
  tagline?: string
}

export function Wordmark({ size = 32, className, nameClassName, tagline }: WordmarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <KavachMark size={size} decorative />
      {/* With a tagline, the name is centred over it rather than both hugging the left. */}
      <span className={cn('flex flex-col', tagline && 'items-center')}>
        <span className={cn('font-display text-2xl font-semibold leading-tight text-accent-line', nameClassName)}>
          Kavach
        </span>
        {/* 10 px, slightly tightened and never wrapped: the full tagline must fit on one
            line beside the mark in the 212 px sidebar. */}
        {tagline && (
          <span className="whitespace-nowrap text-[10px] leading-tight tracking-[-0.01em] text-muted">{tagline}</span>
        )}
      </span>
    </span>
  )
}
