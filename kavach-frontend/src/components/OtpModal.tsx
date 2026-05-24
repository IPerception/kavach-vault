import * as Dialog from '@radix-ui/react-dialog'
import { useRef } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { ClipboardCopy } from './ClipboardCopy'
import { CountdownTimer } from './CountdownTimer'
import { MaskedPassword } from './MaskedPassword'
import { useOtpFlow } from '../hooks/useOtpFlow'

interface OtpModalProps {
  credentialId: number
  purpose: string
  children: React.ReactNode
}

export function OtpModal({ credentialId, purpose, children }: OtpModalProps) {
  const { state, password, error, open, submitCode, reset } = useOtpFlow(credentialId)
  const codeRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog.Root onOpenChange={(isOpen) => { if (!isOpen) reset() }}>
      <Dialog.Trigger asChild onClick={open}>
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl focus:outline-none"
          onEscapeKeyDown={reset}
          onInteractOutside={reset}
        >
          <Dialog.Title className="mb-1 text-base font-semibold text-kavach-500">
            Reveal password
          </Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-zinc-400">
            Enter the 6-digit code from your authenticator app to reveal the password for{' '}
            <span className="font-medium text-zinc-200">{purpose}</span>.
          </Dialog.Description>

          {(state === 'awaiting-code' || state === 'revealing') && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                submitCode(codeRef.current?.value ?? '')
              }}
            >
              <Input
                ref={codeRef}
                label="Authenticator code"
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                autoComplete="one-time-code"
                autoFocus
                error={error ?? undefined}
              />
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="secondary" type="button" onClick={reset}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" loading={state === 'revealing'}>
                  Verify
                </Button>
              </div>
            </form>
          )}

          {state === 'revealed' && password && (
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                <MaskedPassword password={password} />
              </div>
              <div className="flex items-center justify-between">
                <ClipboardCopy text={password} label="Copy password" />
                <CountdownTimer seconds={60} onExpire={reset} />
              </div>
              <div className="flex justify-end">
                <Dialog.Close asChild>
                  <Button variant="secondary" type="button" onClick={reset}>
                    Done
                  </Button>
                </Dialog.Close>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
