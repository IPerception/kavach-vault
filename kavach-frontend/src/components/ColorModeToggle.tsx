import { Moon, Sun } from 'lucide-react'
import { useKavachStore } from '../store/useKavachStore'
import { IconButton } from './ui/IconButton'
import { cn } from './ui/cn'

/** Light / dark switch: the sidebar, the lock screen and the setup wizard. */
export function ColorModeToggle({ className }: { className?: string }) {
  const colorMode = useKavachStore((s) => s.colorMode)
  const setColorMode = useKavachStore((s) => s.setColorMode)
  const nextMode = colorMode === 'dark' ? 'light' : 'dark'
  return (
    <IconButton
      label={`Switch to ${nextMode} mode`}
      size={32}
      className={cn('border-border bg-raised', className)}
      onClick={() => setColorMode(nextMode)}
    >
      {colorMode === 'dark' ? (
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </IconButton>
  )
}
