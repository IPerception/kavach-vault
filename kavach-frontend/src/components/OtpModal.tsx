import { useRef } from 'react'
import { ShieldCheck, FileText } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/Dialog'
import { ClipboardCopy } from './ClipboardCopy'
import { CountdownTimer } from './CountdownTimer'
import { MaskedPassword } from './MaskedPassword'
import { useOtpFlow } from '../hooks/useOtpFlow'

interface OtpModalProps {
  credentialId: number
  purpose: string
  credentialType?: 'PASSWORD' | 'NOTE'
  children: React.ReactNode
}

export function OtpModal({ credentialId, purpose, credentialType = 'PASSWORD', children }: OtpModalProps) {
  const { state, password, error, open, submitCode, reset } = useOtpFlow(credentialId)
  const codeRef = useRef<HTMLInputElement>(null)
  const isNote = credentialType === 'NOTE'

  return (
    <Dialog onOpenChange={(isOpen) => { if (!isOpen) reset() }}>
      <DialogTrigger asChild onClick={open}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm" onEscapeKeyDown={reset} onInteractOutside={reset}>
        <div className="mb-4 flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
            {isNote
              ? <FileText className="h-5 w-5 text-accent-text" aria-hidden="true" />
              : <ShieldCheck className="h-5 w-5 text-accent-text" aria-hidden="true" />}
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-text">
              {isNote ? 'Reveal note' : 'Reveal password'}
            </DialogTitle>
            <DialogDescription className="text-sm text-soft">
              {purpose}
            </DialogDescription>
          </div>
        </div>
        <p className="mb-4 text-sm text-soft">
          Enter the 6-digit code from your authenticator app.
        </p>

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
              <DialogClose asChild>
                <Button variant="secondary" type="button" onClick={reset}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={state === 'revealing'}>
                Verify
              </Button>
            </div>
          </form>
        )}

        {state === 'revealed' && password && (
          <div className="space-y-3">
            {isNote ? (
              <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-control border border-border bg-input p-3 font-mono text-sm text-text">
                {password}
              </pre>
            ) : (
              <div className="rounded-control border border-border bg-input p-3">
                <MaskedPassword password={password} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <ClipboardCopy text={password} label={isNote ? 'Copy note' : 'Copy password'} />
              <CountdownTimer seconds={60} onExpire={reset} />
            </div>
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button variant="secondary" type="button" onClick={reset}>
                  Done
                </Button>
              </DialogClose>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
