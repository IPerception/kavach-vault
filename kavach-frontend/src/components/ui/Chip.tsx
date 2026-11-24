import { type AnchorHTMLAttributes, type HTMLAttributes } from 'react'
import { cn } from './cn'

type Tone = 'neutral' | 'ok' | 'fair' | 'weak'

const dotClasses: Record<Exclude<Tone, 'neutral'>, string> = {
  ok: 'bg-ok-bar',
  fair: 'bg-fair-bar',
  weak: 'bg-weak-bar',
}

const textClasses: Record<Tone, string> = {
  neutral: 'text-soft',
  ok: 'text-ok-text',
  fair: 'text-fair-text',
  weak: 'text-weak-text',
}

type ChipProps = { tone?: Tone } & (
  | ({ as?: 'span' } & HTMLAttributes<HTMLSpanElement>)
  | ({ as: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
)

export function Chip({ tone = 'neutral', className, children, ...props }: ChipProps) {
  const classes = cn(
    'inline-flex h-6 items-center gap-1.5 rounded-full border border-chip-border bg-chip px-2.5 font-mono text-2xs',
    textClasses[tone],
    props.as === 'a' &&
      'transition-colors hover:text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    className,
  )
  const content = (
    <>
      {tone === 'neutral' ? null : (
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
