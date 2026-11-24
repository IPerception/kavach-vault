import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'
import { cn } from './cn'
import { Tooltip } from './Tooltip'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: becomes the aria-label and the tooltip text. */
  label: string
  /** Square size in px. */
  size?: 30 | 32
  /**
   * Show the label as a tooltip (default). Pass false where the icon needs no hint and
   * the button can receive focus programmatically, e.g. a dialog's Close: Radix opens a
   * tooltip on focus, and that tooltip would swallow the first Escape.
   */
  tooltip?: boolean
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 30, tooltip = true, className, children, type = 'button', ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-control border border-transparent text-soft transition-colors',
          'hover:bg-row-hover hover:text-text',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          size === 32 ? 'h-8 w-8' : 'h-[30px] w-[30px]',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
    return tooltip ? <Tooltip label={label}>{button}</Tooltip> : button
  },
)
IconButton.displayName = 'IconButton'
