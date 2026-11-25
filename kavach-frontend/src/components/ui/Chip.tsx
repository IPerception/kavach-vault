import { type AnchorHTMLAttributes, type HTMLAttributes } from 'react'
import { cn } from './cn'

// Colour says what kind of chip it is. Red/amber/green are reserved for strength and
// issues (with a dot), so they keep meaning "weak / fair / strong"; a website is navy (the
// logo's secondary) and a tag is a gold tint.
type Tone = 'neutral' | 'site' | 'tag' | 'ok' | 'fair' | 'weak'

const dotClasses: Partial<Record<Tone, string>> = {
  ok: 'bg-ok-bar',
  fair: 'bg-fair-bar',
  weak: 'bg-weak-bar',
}

const toneClasses: Record<Tone, string> = {
  neutral: 'border-chip-border bg-chip text-soft',
  site: 'border-tile-fg/25 bg-tile text-tile-fg',
  tag: 'border-accent-line/40 bg-accent/10 text-accent-text',
  ok: 'border-ok-bar/35 bg-ok-bar/10 text-ok-text',
  fair: 'border-fair-bar/35 bg-fair-bar/10 text-fair-text',
  weak: 'border-weak-bar/35 bg-weak-bar/10 text-weak-text',
}

type ChipProps = { tone?: Tone } & (
  | ({ as?: 'span' } & HTMLAttributes<HTMLSpanElement>)
  | ({ as: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
)

export function Chip({ tone = 'neutral', className, children, ...props }: ChipProps) {
  const classes = cn(
    'inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 font-mono text-2xs',
    toneClasses[tone],
    props.as === 'a' &&
      'transition-colors hover:text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    className,
  )
  const content = (
    <>
      {dotClasses[tone] && (
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dotClasses[tone])} />
      )}
      {children}
    </>
  )

  if (props.as === 'a') {
    const { as: _as, ...anchorProps } = props
    return (
      <a className={classes} {...anchorProps}>
        {content}
      </a>
    )
  }
  const { as: _as, ...spanProps } = props
  return (
    <span className={classes} {...spanProps}>
      {content}
    </span>
  )
}
