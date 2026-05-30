import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-kavach-500',
          error ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700',
          className,
        )}
        {...props}
      />
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  ),
)
Input.displayName = 'Input'
