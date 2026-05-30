import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { SmartphoneNfc, RefreshCw, Info } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { register as registerVault, login as loginUser, setupTotp, confirmTotp } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-3xl overflow-hidden !p-0">
        <div className="flex h-[540px]">
          {/* Left column - logo panel */}
          <div className="relative w-2/4 bg-zinc-100 dark:bg-zinc-800">
            <img
              src="/Kavach-Logo.png"
              alt="Kavach"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right column - form */}
          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-8">
            <CardHeader>
              <CardTitle className="text-center font-bold underline text-kavach-500">Create Master Kavach</CardTitle>
              <ul className="mt-2 space-y-1 text-sm text-zinc-400 list-disc list-inside">
                <li>This vault is created once per device</li>
                <li>Use a passphrase with uppercase, digits, and symbols</li>
                <li>No cloud backup -- if forgotten, vault data is unrecoverable</li>
              </ul>
            </CardHeader>

            <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
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
                autoComplete="new-password"
                error={errors.confirm?.message}
                {...register('confirm')}
              />
              {registerMutation.isError && (
                <p className="text-xs text-red-400">Setup failed. Please try again.</p>
              )}
              <Button type="submit" className="w-full" loading={registerMutation.isPending}>
                Create vault
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-3xl overflow-hidden !p-0">
        <div className="flex h-[480px]">
          {/* Left column - logo panel */}
          <div className="relative w-2/4 bg-zinc-100 dark:bg-zinc-800">
            <img
              src="/Kavach-Logo.png"
              alt="Kavach"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right column - content */}
          <div className="relative flex flex-1 flex-col justify-center overflow-y-auto p-8">
            <button
              onClick={onReset}
              className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label="Refresh QR code"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <CardHeader>
              <div className="mb-2 flex items-center justify-center gap-2">
                <SmartphoneNfc className="h-5 w-5 text-kavach-500" />
                <CardTitle className="text-center font-bold underline text-kavach-500">Set up authenticator</CardTitle>
              </div>
              <p className="text-center text-sm text-zinc-400">
                Scan this QR code with Google Authenticator, Authy, or any TOTP app. You will need it
                each time you reveal a saved password.
              </p>
            </CardHeader>

            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border border-zinc-700 bg-white p-3">
                <QRCodeSVG value={data.qrCodeUri} size={160} />
              </div>

              <details className="w-full text-xs text-zinc-500">
                <summary className="cursor-pointer select-none">Can't scan? Enter manually</summary>
                <div className="mt-2 rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                  <div className="mb-1 flex items-center gap-1 text-zinc-500">
                    <span>Secret key</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 cursor-help" />
                      <div className="absolute bottom-full left-1/2 mb-2 hidden w-56 -translate-x-1/2 rounded bg-zinc-700 px-3 py-2 text-xs text-zinc-200 shadow-lg group-hover:block">
                        A shared key between Kavach and your authenticator app. It generates the same time-based codes as the QR code above. Keep it private.
                      </div>
                    </div>
                  </div>
                  <p className="break-all font-mono text-zinc-700 dark:text-zinc-300">{data.secret}</p>
                </div>
              </details>

              <form
                className="w-full space-y-3"
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
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
