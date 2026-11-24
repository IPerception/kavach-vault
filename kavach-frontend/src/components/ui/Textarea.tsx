import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from './cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-soft">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          'rounded-control border bg-input px-3 py-2 text-sm text-text',
          'placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-ring',
          error ? 'border-weak-bar' : 'border-border',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-weak-text">{error}</span>}
    </div>
  ),
)
Textarea.displayName = 'Textarea'
