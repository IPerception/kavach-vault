import { Search } from 'lucide-react'

interface CredentialSearchProps {
  value: string
  onChange: (value: string) => void
}

export function CredentialSearch({ value, onChange }: CredentialSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search credentials..."
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  )
}
