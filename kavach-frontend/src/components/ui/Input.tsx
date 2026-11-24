import { type InputHTMLAttributes, forwardRef, useId } from 'react'
import { cn } from './cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Render the value in the mono font (passwords, keys, codes). */
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, mono, id, className, 'aria-describedby': describedBy, ...props }, ref) => {
    const messageId = useId()
    const hasMessage = Boolean(error || hint)
    const ariaDescribedBy = [describedBy, hasMessage ? messageId : undefined].filter(Boolean).join(' ') || undefined
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-soft">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(
            'h-9 rounded-control border bg-input px-3 text-sm text-text',
            'placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-ring',
            mono && 'font-mono',
            error ? 'border-weak-bar' : 'border-border',
            className,
          )}
          {...props}
        />
        {hint && !error && <span id={messageId} className="text-xs text-muted">{hint}</span>}
        {error && <span id={messageId} className="text-xs text-weak-text">{error}</span>}
      </div>
    )
  },
)
Input.displayName = 'Input'
