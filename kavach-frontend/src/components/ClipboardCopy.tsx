import { Check, Copy } from 'lucide-react'
import { useClipboard } from '../hooks/useClipboard'

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
      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 focus:outline-none
        ${copied
          ? 'bg-green-500/15 text-green-400'
          : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
    >
      {copied ? (
        <Check className="mr-1 h-3.5 w-3.5 animate-pop-in" />
      ) : (
        <Copy className="mr-1 h-3.5 w-3.5" />
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}
