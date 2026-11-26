import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { SmartphoneNfc, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { register as registerVault, login as loginUser, setupTotp, confirmTotp } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'
import { BrandHero } from '../components/BrandHero'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import type { TotpSetupData } from '../api/types'

const strongPassword = z
  .string()
  .min(12, 'At least 12 characters')
  .refine(
    (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p),
    'Must contain uppercase, lowercase, digit, and special character.',
  )

const schema = z
  .object({
    username: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
    email: z.string().email('Must be a valid email'),
    masterPassword: strongPassword,
    confirm: z.string(),
  })
  .refine((d) => d.masterPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

export function SetupWizard() {
  const { unlock } = useKavachStore()
  const [step, setStep] = useState<'register' | 'totp'>('register')
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
  const [savedUsername, setSavedUsername] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const password = watch('masterPassword', '')

  const registerMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      await registerVault({ username: data.username, email: data.email, password: data.masterPassword })
      await loginUser({ username: data.username, password: data.masterPassword })
      const totp = await setupTotp()
      return { username: data.username, totp }
    },
    onSuccess: ({ username, totp }) => {
      setSavedUsername(username)
      setTotpData(totp)
      setStep('totp')
    },
  })

  const resetTotpMutation = useMutation({
    mutationFn: setupTotp,
    onSuccess: (totp) => setTotpData(totp),
  })

  if (step === 'totp' && totpData) {
    return (
      <TotpSetupStep
        data={totpData}
        username={savedUsername}
        onReset={() => resetTotpMutation.mutate()}
        onComplete={() => {
          localStorage.setItem('kavach_username', savedUsername)
          unlock()
        }}
      />
    )
  }

  return (
    <BrandHero wide>
      <div className="rule-gold mb-4">
        <h1 className="font-display text-xl font-semibold text-text">Create your vault</h1>
      </div>
      <ul className="mb-5 list-inside list-disc space-y-1 text-sm text-soft">
        <li>This vault is created once per device.</li>
        <li>Use a passphrase with uppercase, digits, and symbols.</li>
        <li>No cloud backup: if the master password is forgotten, the vault cannot be recovered.</li>
      </ul>

      <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="username"
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <div>
            <Input
              id="masterPassword"
              label="Master password"
              type="password"
              mono
              autoComplete="new-password"
              error={errors.masterPassword?.message}
              {...register('masterPassword')}
            />
            <PasswordStrengthMeter password={password} />
          </div>
          <Input
            id="confirm"
            label="Confirm password"
            type="password"
            mono
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm')}
          />
        </div>
        {registerMutation.isError && <p className="text-xs text-weak-text">Setup failed. Please try again.</p>}
        <Button type="submit" className="w-full" loading={registerMutation.isPending}>
          Create vault
        </Button>
      </form>
    </BrandHero>
  )
}

interface TotpSetupStepProps {
  data: TotpSetupData
  username: string
  onReset: () => void
  onComplete: () => void
}

function TotpSetupStep({ data, onReset, onComplete }: TotpSetupStepProps) {
  const codeRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const confirmMutation = useMutation({
    mutationFn: () => confirmTotp(codeRef.current?.value ?? ''),
    onSuccess: onComplete,
    onError: () => setError('Invalid code. Open your authenticator app and try the current code.'),
  })

  return (
    <BrandHero wide>
      <div className="rule-gold mb-4 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-text">
          <SmartphoneNfc className="h-5 w-5 text-accent-text" aria-hidden="true" />
          Set up authenticator
        </h1>
        <IconButton label="Refresh QR code" onClick={onReset}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      <p className="mb-5 text-sm text-soft">
        Scan this QR code with Google Authenticator, Authy, or any TOTP app. You will need it each
        time you reveal a saved password.
      </p>

      <div className="grid items-start gap-5 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto rounded-control border border-border bg-white p-3">
          <QRCodeSVG value={data.qrCodeUri} size={160} />
        </div>

        <div className="flex flex-col gap-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              confirmMutation.mutate()
            }}
          >
            <Input
              ref={codeRef}
              id="totp-confirm"
              label="6-digit code from your app"
              type="text"
              mono
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              autoFocus
              error={error ?? undefined}
            />
            <Button type="submit" className="w-full" loading={confirmMutation.isPending}>
              Confirm and open vault
            </Button>
          </form>

          <details className="text-xs text-muted">
            <summary className="cursor-pointer select-none">Can't scan? Enter the key manually</summary>
            <div className="mt-2 rounded-control border border-border bg-chip px-3 py-2">
              <p className="mb-1 text-muted">
                Secret key: a shared key between Kavach and your authenticator app. It makes the same
                codes as the QR code. Keep it private.
              </p>
              <p className="break-all font-mono text-text">{data.secret}</p>
            </div>
          </details>
        </div>
      </div>
    </BrandHero>
  )
}
