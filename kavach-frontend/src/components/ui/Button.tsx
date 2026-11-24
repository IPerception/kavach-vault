import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  /** Keyboard hint rendered after the label, e.g. "N" or "Enter". */
  kbd?: string
}

const variantClasses: Record<Variant, string> = {
  primary: 'border-transparent bg-accent text-accent-fg hover:brightness-95',
  secondary: 'border-border bg-raised text-soft hover:bg-row-hover hover:text-text',
  danger: 'border-weak-bar bg-transparent text-weak-text hover:bg-weak-bar/10',
  ghost: 'border-transparent bg-transparent text-soft hover:bg-row-hover hover:text-text',
}

// lg is kept for existing callers (lock screen, wizard); the design itself uses sm and md.
const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, kbd, disabled, children, className, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control border font-medium transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
      {children}
      {kbd ? (
        <kbd className="rounded-sm border border-current/30 px-1 font-mono text-2xs leading-4 opacity-70">{kbd}</kbd>
      ) : null}
    </button>
  ),
)
Button.displayName = 'Button'
