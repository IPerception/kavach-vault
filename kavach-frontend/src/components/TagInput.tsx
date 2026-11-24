import { useId, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Chip } from './ui/Chip'
import { IconButton } from './ui/IconButton'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagInput({ value, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputId = useId()

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
      <label htmlFor={inputId} className="text-sm font-medium text-soft">Tags (optional)</label>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-control border border-border bg-input px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        {value.map((tag) => (
          <Chip key={tag} className="pr-1">
            #{tag}
            <IconButton
              label={`Remove tag ${tag}`}
              tooltip={false}
              onClick={() => removeTag(tag)}
              className="h-4 w-4 rounded-full"
            >
              <X size={12} aria-hidden="true" />
            </IconButton>
          </Chip>
        ))}
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue) addTag(inputValue) }}
          placeholder={value.length === 0 ? 'Type and press Enter or comma' : ''}
          className="min-w-32 flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-hidden"
        />
      </div>
      <p className="text-xs text-muted">Press Enter or comma to add a tag</p>
    </div>
  )
}
