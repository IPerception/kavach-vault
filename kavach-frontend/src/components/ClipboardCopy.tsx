import { Check, Copy } from 'lucide-react'
import { useClipboard } from '../hooks/useClipboard'
import { cn } from './ui/cn'

interface ClipboardCopyProps {
  text: string
  label?: string
}

export function ClipboardCopy({ text, label = 'Copy' }: ClipboardCopyProps) {
  const { copy, copied } = useClipboard()

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={cn(
        'inline-flex items-center gap-1 rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-200',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        copied ? 'bg-ok-bar/15 text-ok-text' : 'bg-transparent text-soft hover:bg-row-hover hover:text-text',
      )}
    >
      {copied ? (
        <Check className="mr-1 h-3.5 w-3.5 animate-pop-in" aria-hidden="true" />
      ) : (
        <Copy className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}
