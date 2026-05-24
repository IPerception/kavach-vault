import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'
import { usePasswordGenerator } from '../hooks/usePasswordGenerator'

interface PasswordGeneratorProps {
  onGenerated: (password: string) => void
}

export function PasswordGenerator({ onGenerated }: PasswordGeneratorProps) {
  const { options, setOptions, generate } = usePasswordGenerator()
  const [preview, setPreview] = useState('')

  const handleGenerate = () => {
    const pw = generate()
    setPreview(pw)
    onGenerated(pw)
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-700 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">Password Generator</span>
        <Button size="sm" variant="ghost" onClick={handleGenerate} type="button">
          <RefreshCw className="mr-1 h-3 w-3" />
          Generate
        </Button>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeUppercase}
            onChange={(e) => setOptions((o) => ({ ...o, includeUppercase: e.target.checked }))}
          />
          A-Z
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeLowercase}
            onChange={(e) => setOptions((o) => ({ ...o, includeLowercase: e.target.checked }))}
          />
          a-z
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeNumbers}
            onChange={(e) => setOptions((o) => ({ ...o, includeNumbers: e.target.checked }))}
          />
          0-9
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={options.includeSymbols}
            onChange={(e) => setOptions((o) => ({ ...o, includeSymbols: e.target.checked }))}
          />
          !@#
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          Length:
          <input
            type="number"
            min={8}
            max={64}
            value={options.length}
            onChange={(e) => setOptions((o) => ({ ...o, length: Number(e.target.value) }))}
            className="w-12 rounded border border-zinc-700 bg-zinc-800 px-1 text-zinc-100"
          />
        </label>
      </div>
      {preview && (
        <p className="break-all rounded bg-zinc-800 px-2 py-1 font-mono text-xs text-zinc-200">
          {preview}
        </p>
      )}
    </div>
  )
}
