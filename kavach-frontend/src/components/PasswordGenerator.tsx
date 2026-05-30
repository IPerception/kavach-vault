import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'
import { usePasswordGenerator, type Preset } from '../hooks/usePasswordGenerator'

interface PasswordGeneratorProps {
  onGenerated: (password: string) => void
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'pin', label: 'PIN' },
  { value: 'alphanumeric', label: 'Alphanum' },
  { value: 'passphrase', label: 'Passphrase' },
]

const SEPARATORS = [
  { value: '-', label: 'Hyphen (word-word)' },
  { value: ' ', label: 'Space (word word)' },
  { value: '.', label: 'Dot (word.word)' },
]

export function PasswordGenerator({ onGenerated }: PasswordGeneratorProps) {
  const {
    preset, setPreset,
    customOptions, setCustomOptions,
    pinLength, setPinLength,
    alphanumLength, setAlphanumLength,
    passphraseOptions, setPassphraseOptions,
    generate,
  } = usePasswordGenerator()

  const [preview, setPreview] = useState('')

  const handleGenerate = () => {
    const pw = generate()
    setPreview(pw)
    onGenerated(pw)
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Password Generator</span>
        <Button size="sm" variant="ghost" onClick={handleGenerate} type="button">
          <RefreshCw className="mr-1 h-3 w-3" />
          Generate
        </Button>
      </div>

      {/* Preset tabs */}
      <div className="flex gap-1">
        {PRESETS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPreset(value)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              preset === value
                ? 'bg-kavach-500 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode-specific controls */}
      <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
        {preset === 'custom' && (
          <>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={customOptions.includeUppercase}
                onChange={(e) => setCustomOptions((o) => ({ ...o, includeUppercase: e.target.checked }))}
              />
              A-Z
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={customOptions.includeLowercase}
                onChange={(e) => setCustomOptions((o) => ({ ...o, includeLowercase: e.target.checked }))}
              />
              a-z
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={customOptions.includeNumbers}
                onChange={(e) => setCustomOptions((o) => ({ ...o, includeNumbers: e.target.checked }))}
              />
              0-9
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={customOptions.includeSymbols}
                onChange={(e) => setCustomOptions((o) => ({ ...o, includeSymbols: e.target.checked }))}
              />
              !@#
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              Length:
              <input
                type="number"
                min={8}
                max={64}
                value={customOptions.length}
                onChange={(e) => setCustomOptions((o) => ({ ...o, length: Number(e.target.value) }))}
                className="w-12 rounded border border-zinc-300 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
          </>
        )}

        {preset === 'pin' && (
          <label className="flex cursor-pointer items-center gap-1">
            Digits:
            <input
              type="number"
              min={4}
              max={8}
              value={pinLength}
              onChange={(e) => setPinLength(Math.min(8, Math.max(4, Number(e.target.value))))}
              className="w-12 rounded border border-zinc-300 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        )}

        {preset === 'alphanumeric' && (
          <label className="flex cursor-pointer items-center gap-1">
            Length:
            <input
              type="number"
              min={8}
              max={64}
              value={alphanumLength}
              onChange={(e) => setAlphanumLength(Number(e.target.value))}
              className="w-12 rounded border border-zinc-300 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <span className="text-zinc-500">(A-Z a-z 0-9)</span>
          </label>
        )}

        {preset === 'passphrase' && (
          <>
            <label className="flex cursor-pointer items-center gap-1">
              Words:
              <input
                type="number"
                min={3}
                max={6}
                value={passphraseOptions.wordCount}
                onChange={(e) =>
                  setPassphraseOptions((o) => ({
                    ...o,
                    wordCount: Math.min(6, Math.max(3, Number(e.target.value))),
                  }))
                }
                className="w-12 rounded border border-zinc-300 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-1">
              Separator:
              <select
                value={passphraseOptions.separator}
                onChange={(e) => setPassphraseOptions((o) => ({ ...o, separator: e.target.value }))}
                className="rounded border border-zinc-300 bg-white px-1 py-0.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {SEPARATORS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <p className="break-all rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          {preview}
        </p>
      )}
    </div>
  )
}
