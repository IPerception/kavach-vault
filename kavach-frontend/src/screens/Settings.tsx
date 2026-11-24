import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { SmartphoneNfc, KeyRound, ChevronRight, Info, Download, Upload, FolderOpen, Clock } from 'lucide-react'
import { changePassword, setupTotp, confirmTotp } from '../api/auth'
import { exportVault } from '../api/credentials'
import { getBackupDestination, setBackupDestination, clearBackupDestination, runBackupNow } from '../api/backup'
import { useKavachStore } from '../store/useKavachStore'
import { EXPIRY_DAYS_KEY, EXPIRY_WARNING_KEY, DEFAULT_EXPIRY_DAYS, DEFAULT_WARNING_DAYS } from '../hooks/useExpiryCheck'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/Dialog'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import { ImportDialog } from '../components/ImportDialog'
import { UpdateCheck } from '../components/UpdateCheck'
import type { TotpSetupData } from '../api/types'

const PASSWORD_RULES = 'Must be at least 12 characters and contain uppercase, lowercase, digit, and special character.'

const strongPassword = z
  .string()
  .min(12, 'At least 12 characters')
  .refine(
    (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p),
    PASSWORD_RULES,
  )

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: strongPassword,
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>
type TotpResetStep = 'idle' | 'scanning' | 'done'
type ActiveModal = 'password' | 'totp' | 'import' | 'backup' | 'expiry' | null

const selectClasses =
  'h-9 rounded-control border border-border bg-input px-3 text-sm text-text focus:outline-hidden focus:ring-2 focus:ring-ring'

const titleIconClasses = 'h-4 w-4 text-accent-text'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  title: string
  description: ReactNode
  icon?: ReactNode
  children: ReactNode
}

/** Shared shell for the Settings modals: Dialog with a title, description and body. */
function SettingsDialog({ open, onClose, title, description, icon, children }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2 pr-8 text-base font-semibold text-text">
          {icon}
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-soft">{description}</DialogDescription>
        <div className="mt-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

function ChangePasswordForm() {
  const { setStatus } = useKavachStore()
  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })
  const newPassword = watch('newPassword', '')

  const passwordMutation = useMutation({
    mutationFn: (data: FormValues) =>
      changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => setStatus('locked'),
    onError: (err: { response?: { status?: number } }) => {
      if (err?.response?.status === 401) {
        setError('currentPassword', { message: 'Incorrect password' })
      } else if (err?.response?.status === 400) {
        setError('newPassword', { message: PASSWORD_RULES })
      }
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => passwordMutation.mutate(d))} className="space-y-4">
      <Input
        id="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <div>
        <Input
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordStrengthMeter password={newPassword} />
      </div>
      <Input
        id="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register('confirm')}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => reset()}>
          Reset
        </Button>
        <Button type="submit" loading={passwordMutation.isPending}>
          Change password
        </Button>
      </div>
    </form>
  )
}

function TotpResetBody({ onClose }: { onClose: () => void }) {
  const [totpStep, setTotpStep] = useState<TotpResetStep>('idle')
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
  const [totpError, setTotpError] = useState<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  const setupMutation = useMutation({
    mutationFn: setupTotp,
    onSuccess: (data) => { setTotpData(data); setTotpStep('scanning'); setTotpError(null) },
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmTotp(codeRef.current?.value ?? ''),
    onSuccess: () => { setTotpStep('done'); setTotpError(null) },
    onError: () => setTotpError('Invalid code. Open your authenticator app and try the current code.'),
  })

  return (
    <>
      {totpStep === 'idle' && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            loading={setupMutation.isPending}
            onClick={() => setupMutation.mutate()}
          >
            Reset authenticator
          </Button>
        </div>
      )}

      {totpStep === 'scanning' && totpData && (
        <div className="space-y-4">
          <p className="text-sm text-soft">
            Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
          </p>
          <div className="flex justify-center">
            <div className="rounded-panel border border-border bg-white p-3">
              <QRCodeSVG value={totpData.qrCodeUri} size={150} />
            </div>
          </div>
          <details className="text-xs text-muted">
            <summary className="cursor-pointer select-none">Can't scan? Enter manually</summary>
            <div className="mt-2 rounded-control border border-border bg-raised px-3 py-2">
              <div className="mb-1 flex items-center gap-1 text-muted">
                <span>Secret key</span>
                <div className="group relative">
                  <Info className="h-3 w-3 cursor-help" />
                  <div className="absolute bottom-full left-1/2 mb-2 hidden w-56 -translate-x-1/2 rounded-control border border-border bg-panel px-3 py-2 text-xs text-soft shadow-surface group-hover:block">
                    A shared key between Kavach and your authenticator app. It generates
                    the same time-based codes as the QR code above. Keep it private.
                  </div>
                </div>
              </div>
              <p className="break-all font-mono text-soft">{totpData.secret}</p>
            </div>
          </details>
          <form
            className="space-y-3"
            onSubmit={(e) => { e.preventDefault(); confirmMutation.mutate() }}
          >
            <Input
              ref={codeRef}
              id="totp-reset-code"
              label="6-digit code from your app"
              type="text"
              mono
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]{6}"
              autoComplete="one-time-code"
              autoFocus
              error={totpError ?? undefined}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setTotpStep('idle'); setTotpData(null) }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={confirmMutation.isPending}>
                Confirm
              </Button>
            </div>
          </form>
        </div>
      )}

      {totpStep === 'done' && (
        <div className="space-y-3">
          <p className="text-sm text-ok-text">
            Authenticator reset successfully. Your new app is now active.
          </p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function BackupBody({ initialPath }: { initialPath: string }) {
  const [backupPath, setBackupPath] = useState(initialPath)
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupRunning, setBackupRunning] = useState(false)

  const saveBackupMutation = useMutation({
    mutationFn: () => setBackupDestination(backupPath),
    onSuccess: () => setBackupStatus('Destination saved.'),
    onError: () => setBackupError('Could not save. Make sure the folder path exists.'),
  })

  const clearBackupMutation = useMutation({
    mutationFn: clearBackupDestination,
    onSuccess: () => { setBackupPath(''); setBackupStatus('Backup destination cleared.') },
    onError: () => setBackupError('Failed to clear destination.'),
  })

  const handleRunNow = async () => {
    setBackupRunning(true)
    setBackupStatus(null)
    setBackupError(null)
    try {
      const result = await runBackupNow()
      setBackupStatus(`Backup saved to: ${result.path}`)
    } catch {
      setBackupError('Backup failed. Check the destination folder exists and is writable.')
    } finally {
      setBackupRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input
        id="backup-path"
        label="Folder path"
        type="text"
        mono
        placeholder="e.g. D:\Backups or /Volumes/USB"
        value={backupPath}
        onChange={(e) => { setBackupPath(e.target.value); setBackupStatus(null); setBackupError(null) }}
      />

      {backupStatus && <p className="text-xs text-ok-text">{backupStatus}</p>}
      {backupError && <p className="text-xs text-weak-text">{backupError}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          loading={saveBackupMutation.isPending}
          onClick={() => saveBackupMutation.mutate()}
        >
          Save
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={backupRunning}
          onClick={handleRunNow}
        >
          Back up now
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={clearBackupMutation.isPending}
          onClick={() => clearBackupMutation.mutate()}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

interface ExpiryBodyProps {
  initialExpiryDays: number
  initialWarningDays: number
  onSave: (expiryDays: number, warningDays: number) => void
  onCancel: () => void
}

function ExpiryBody({ initialExpiryDays, initialWarningDays, onSave, onCancel }: ExpiryBodyProps) {
  const [expiryDays, setExpiryDays] = useState(initialExpiryDays)
  const [warningDays, setWarningDays] = useState(initialWarningDays)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="expiry-days" className="text-sm font-medium text-soft">
          Expiry period
        </label>
        <select
          id="expiry-days"
          value={expiryDays}
          onChange={(e) => setExpiryDays(Number(e.target.value))}
          className={selectClasses}
        >
          <option value={60}>60 days</option>
          <option value={90}>90 days (default)</option>
          <option value={180}>180 days</option>
          <option value={365}>365 days</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="warning-days" className="text-sm font-medium text-soft">
          Warn me before expiry
        </label>
        <select
          id="warning-days"
          value={warningDays}
          onChange={(e) => setWarningDays(Number(e.target.value))}
          className={selectClasses}
        >
          <option value={7}>7 days before</option>
          <option value={14}>14 days before (default)</option>
          <option value={30}>30 days before</option>
        </select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={() => onSave(expiryDays, warningDays)}>Save</Button>
      </div>
    </div>
  )
}

export function Settings() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const closeModal = () => setActiveModal(null)

  // --- export ---
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const payload = await exportVault()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kavach-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // --- backup destination: fetched before the dialog opens ---
  const [backupInitialPath, setBackupInitialPath] = useState('')

  const openBackupModal = async () => {
    try {
      const data = await getBackupDestination()
      setBackupInitialPath(data.destination)
    } catch {
      setBackupInitialPath('')
    }
    setActiveModal('backup')
  }

  // --- password expiry ---
  const [expiryDays, setExpiryDays] = useState(
    () => parseInt(localStorage.getItem(EXPIRY_DAYS_KEY) ?? String(DEFAULT_EXPIRY_DAYS))
  )
  const [warningDays, setWarningDays] = useState(
    () => parseInt(localStorage.getItem(EXPIRY_WARNING_KEY) ?? String(DEFAULT_WARNING_DAYS))
  )

  function saveExpiry(nextExpiryDays: number, nextWarningDays: number) {
    localStorage.setItem(EXPIRY_DAYS_KEY, String(nextExpiryDays))
    localStorage.setItem(EXPIRY_WARNING_KEY, String(nextWarningDays))
    setExpiryDays(nextExpiryDays)
    setWarningDays(nextWarningDays)
    closeModal()
  }

  const settingsItems = [
    {
      key: 'password' as const,
      icon: <KeyRound className="h-5 w-5" />,
      title: 'Change master password',
      description: 'Update your vault master password',
    },
    {
      key: 'totp' as const,
      icon: <SmartphoneNfc className="h-5 w-5" />,
      title: 'Authenticator app',
      description: 'Reset and re-enroll your TOTP authenticator',
    },
    {
      key: 'export' as const,
      icon: <Download className="h-5 w-5" />,
      title: 'Export vault',
      description: 'Download an encrypted backup of all credentials',
    },
    {
      key: 'import' as const,
      icon: <Upload className="h-5 w-5" />,
      title: 'Import vault',
      description: 'Restore credentials from a Kavach export file',
    },
    {
      key: 'backup' as const,
      icon: <FolderOpen className="h-5 w-5" />,
      title: 'Backup destination',
      description: 'Copy the database to a folder on each startup',
    },
    {
      key: 'expiry' as const,
      icon: <Clock className="h-5 w-5" />,
      title: 'Password expiry',
      description: `Remind when passwords are older than ${expiryDays} days`,
    },
  ]

  return (
    <>
      <h1 className="mb-6 font-display text-xl font-semibold text-text">Settings</h1>

      {/* Settings list */}
      <Card className="max-w-lg p-0!">
        <ul className="divide-y divide-border">
          {settingsItems.map((item) => (
            <li key={item.key}>
              <button
                className="flex w-full items-center gap-4 px-6 py-5 transition-colors hover:bg-row-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
                onClick={() => item.key === 'export' ? handleExport() : item.key === 'backup' ? openBackupModal() : setActiveModal(item.key)}
                disabled={item.key === 'export' && exporting}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-control bg-raised text-accent-text">
                  {item.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">{item.title}</p>
                  <p className="text-xs text-soft">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <UpdateCheck />

      {exportError && (
        <p className="mt-2 text-xs text-weak-text">{exportError}</p>
      )}

      <SettingsDialog
        open={activeModal === 'password'}
        onClose={closeModal}
        title="Change master password"
        icon={<KeyRound className={titleIconClasses} aria-hidden="true" />}
        description="After changing, you will be logged out and must unlock with the new password."
      >
        <ChangePasswordForm />
      </SettingsDialog>

      <SettingsDialog
        open={activeModal === 'totp'}
        onClose={closeModal}
        title="Authenticator app"
        icon={<SmartphoneNfc className={titleIconClasses} aria-hidden="true" />}
        description="Reset your TOTP secret and re-enroll a new authenticator app. Use this if you lose access to your current authenticator."
      >
        <TotpResetBody onClose={closeModal} />
      </SettingsDialog>

      <ImportDialog open={activeModal === 'import'} onOpenChange={(next) => { if (!next) closeModal() }} />

      <SettingsDialog
        open={activeModal === 'backup'}
        onClose={closeModal}
        title="Backup destination"
        icon={<FolderOpen className={titleIconClasses} aria-hidden="true" />}
        description="On each startup, Kavach copies your database to this folder. Leave blank to disable automatic backups."
      >
        <BackupBody initialPath={backupInitialPath} />
      </SettingsDialog>

      <SettingsDialog
        open={activeModal === 'expiry'}
        onClose={closeModal}
        title="Password expiry"
        icon={<Clock className={titleIconClasses} aria-hidden="true" />}
        description="Kavach will remind you when passwords have not been updated within the expiry period."
      >
        <ExpiryBody
          initialExpiryDays={expiryDays}
          initialWarningDays={warningDays}
          onSave={saveExpiry}
          onCancel={closeModal}
        />
      </SettingsDialog>
    </>
  )
}
