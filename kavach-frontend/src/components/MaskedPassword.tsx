import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/Button'

interface MaskedPasswordProps {
  password: string
}

export function MaskedPassword({ password }: MaskedPasswordProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span className="break-all">{visible ? password : '•'.repeat(Math.min(password.length, 16))}</span>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </span>
  )
}
