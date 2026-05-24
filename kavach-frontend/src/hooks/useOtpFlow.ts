import { useState } from 'react'
import { revealPassword } from '../api/credentials'

type OtpFlowState = 'idle' | 'awaiting-code' | 'revealing' | 'revealed'

export function useOtpFlow(credentialId: number) {
  const [state, setState] = useState<OtpFlowState>('idle')
  const [password, setPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = () => {
    setState('awaiting-code')
    setError(null)
    setPassword(null)
  }

  const submitCode = async (code: string) => {
    setState('revealing')
    setError(null)
    try {
      const result = await revealPassword(credentialId, code)
      setPassword(result.password)
      setState('revealed')
    } catch (err: unknown) {
      const msg = extractErrorMessage(err) ?? 'Invalid code. Please try again.'
      setError(msg)
      setState('awaiting-code')
    }
  }

  const reset = () => {
    setState('idle')
    setPassword(null)
    setError(null)
  }

  return { state, password, error, open, submitCode, reset }
}

function extractErrorMessage(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string } } }).response
    return response?.data?.detail ?? null
  }
  return null
}
