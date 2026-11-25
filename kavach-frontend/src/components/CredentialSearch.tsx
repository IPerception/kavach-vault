import { forwardRef, useId } from 'react'
import { Search } from 'lucide-react'

interface CredentialSearchProps {
  value: string
  onChange: (value: string) => void
}

export const CredentialSearch = forwardRef<HTMLInputElement, CredentialSearchProps>(
  function CredentialSearch({ value, onChange }, ref) {
    const id = useId()
    return (
      <div className="flex h-8 min-w-0 flex-[0_1_320px] items-center gap-2 rounded-control border border-border bg-input px-2.5 focus-within:ring-2 focus-within:ring-ring">
        <label htmlFor={id} className="sr-only">
          Search vault
        </label>
        <Search className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
        <input
          id={id}
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search name, username, website or #tag"
          className="min-w-0 grow border-none bg-transparent font-mono text-xs text-text outline-hidden placeholder:text-muted"
        />
        {!value && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none hidden rounded-sm border border-border px-1.5 font-mono text-2xs text-muted sm:block"
          >
            Ctrl K
          </kbd>
        )}
      </div>
    )
  }
)
