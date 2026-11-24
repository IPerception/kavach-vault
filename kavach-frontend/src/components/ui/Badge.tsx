import { type HTMLAttributes } from 'react'
import { cn } from './cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger'

const variants: Record<BadgeVariant, string> = {
  default: 'border-chip-border bg-chip text-soft',
  success: 'border-transparent bg-ok-bar/15 text-ok-text',
  warning: 'border-warn-border bg-warn-bg text-warn-text',
  danger: 'border-transparent bg-weak-bar/15 text-weak-text',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
