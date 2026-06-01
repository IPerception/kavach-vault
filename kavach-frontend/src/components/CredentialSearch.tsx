import { forwardRef } from 'react'
import { Search } from 'lucide-react'

interface CredentialSearchProps {
  value: string
  onChange: (value: string) => void
}

export const CredentialSearch = forwardRef<HTMLInputElement, CredentialSearchProps>(
  function CredentialSearch({ value, onChange }, ref) {
    return (
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search credentials..."
          className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-16 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-kavach-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {!value && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden gap-0.5 sm:flex">
            <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-500">Ctrl</kbd>
            <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-500">K</kbd>
          </span>
        )}
      </div>
    )
  }
)
