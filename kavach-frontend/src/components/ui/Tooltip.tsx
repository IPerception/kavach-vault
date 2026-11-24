import { type ReactElement, type ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

/**
 * Optional. Every Tooltip already brings its own provider (below), so neither the app nor
 * tests need to mount one; without that, any screen test rendering an IconButton would
 * crash with "Tooltip must be used within TooltipProvider".
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={300}>{children}</TooltipPrimitive.Provider>
}

interface TooltipProps {
  label: string
  /** A single element that can take a ref; it becomes the trigger. */
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 rounded-control border border-border bg-raised px-2 py-1 text-xs text-text shadow-surface"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  )
}
