import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ value, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (tag && !value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputValue('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-300">Tags (optional)</label>
      <div className="flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 focus-within:ring-2 focus-within:ring-kavach-500">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-kavach-500/20 px-2 py-0.5 text-xs font-medium text-kavach-400"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-kavach-400 hover:text-kavach-300"
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue) addTag(inputValue) }}
          placeholder={value.length === 0 ? 'Type and press Enter or comma' : ''}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
      </div>
      <p className="text-xs text-zinc-500">Press Enter or comma to add a tag</p>
    </div>
  )
}
