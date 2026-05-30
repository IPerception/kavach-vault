import { useState } from 'react'
import { X, ArrowUpCircle } from 'lucide-react'

const RELEASES_PAGE = 'https://github.com/IPerception/kavach-vault/releases'

interface Props {
  version: string
}

export function UpdateBanner({ version }: Props) {
  const dismissKey = `kavach_dismissed_update_${version}`
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(dismissKey) === '1',
  )

  if (dismissed) return null

  function dismiss() {
    localStorage.setItem(dismissKey, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-kavach-500/30 bg-kavach-500/10 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-kavach-300">
        <ArrowUpCircle className="h-4 w-4 shrink-0 text-kavach-400" />
        <span>
          Kavach <span className="font-semibold">{version}</span> is available.{' '}
          <a
            href={RELEASES_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-kavach-200"
          >
            Download
          </a>
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss update notification"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-kavach-400 hover:bg-kavach-500/20 hover:text-kavach-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
