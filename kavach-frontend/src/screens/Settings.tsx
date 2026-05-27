import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { SmartphoneNfc, KeyRound, Palette, ChevronRight, X, Info, Download, Upload, FolderOpen } from 'lucide-react'
import { changePassword, setupTotp, confirmTotp } from '../api/auth'
import { exportVault, importVault } from '../api/credentials'
import { getBackupDestination, setBackupDestination, clearBackupDestination, runBackupNow } from '../api/backup'
import { useKavachStore, type KavachTheme } from '../store/useKavachStore'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import type { ImportResult, TotpSetupData, VaultExport } from '../api/types'

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
type ActiveModal = 'password' | 'totp' | 'theme' | 'import' | 'backup' | null

const THEMES: { id: KavachTheme; label: string; color: string }[] = [
  { id: 'amber',   label: 'Amber',   color: '#f59e0b' },
  { id: 'sky',     label: 'Sky',     color: '#0ea5e9' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'rose',    label: 'Rose',    color: '#f43f5e' },
  { id: 'violet',  label: 'Violet',  color: '#8b5cf6' },
]

export function Settings() {
  const { setStatus, theme, setTheme } = useKavachStore()
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const qc = useQueryClient()

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

  // --- import ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (payload: VaultExport) => importVault(payload),
    onSuccess: (result) => {
      setImportResult(result)
      qc.invalidateQueries({ queryKey: ['credentials'] })
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setImportError(err?.response?.data?.detail ?? 'Import failed. The file may be invalid or from a different vault.')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target?.result as string) as VaultExport
        importMutation.mutate(payload)
      } catch {
        setImportError('Could not read file. Make sure it is a valid Kavach export.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const closeImportModal = () => {
    setActiveModal(null)
    setImportResult(null)
    setImportError(null)
  }

  // --- change password ---
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

  // --- totp reset ---
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

  const closeModal = () => {
    setActiveModal(null)
    setTotpStep('idle')
    setTotpData(null)
    setTotpError(null)
  }

  // --- backup destination ---
  const [backupPath, setBackupPath] = useState('')
  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupRunning, setBackupRunning] = useState(false)

  const openBackupModal = async () => {
    setBackupStatus(null)
    setBackupError(null)
    try {
      const data = await getBackupDestination()
      setBackupPath(data.destination)
    } catch {
      setBackupPath('')
    }
    setActiveModal('backup')
  }

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

  const closeBackupModal = () => {
    setActiveModal(null)
    setBackupStatus(null)
    setBackupError(null)
  }

  const settingsItems = [
    {
      key: 'password' as const,
      icon: <KeyRound className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Change master password',
      description: 'Update your vault master password',
    },
    {
      key: 'totp' as const,
      icon: <SmartphoneNfc className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Authenticator app',
      description: 'Reset and re-enroll your TOTP authenticator',
    },
    {
      key: 'theme' as const,
      icon: <Palette className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Theme',
      description: 'Choose your accent colour',
    },
    {
      key: 'export' as const,
      icon: <Download className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Export vault',
      description: 'Download an encrypted backup of all credentials',
    },
    {
      key: 'import' as const,
      icon: <Upload className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Import vault',
      description: 'Restore credentials from a Kavach export file',
    },
    {
      key: 'backup' as const,
      icon: <FolderOpen className="h-5 w-5 text-kavach-500" />,
      iconBg: 'bg-kavach-500/10',
      title: 'Backup destination',
      description: 'Copy the database to a folder on each startup',
    },
  ]

  return (
    <>
      {/* Settings list */}
      <Card className="max-w-lg !p-0">
        <ul className="divide-y divide-zinc-800">
          {settingsItems.map((item) => (
            <li key={item.key}>
              <button
                className="flex w-full items-center gap-4 px-6 py-5 transition-colors hover:bg-zinc-800/60"
                onClick={() => item.key === 'export' ? handleExport() : item.key === 'backup' ? openBackupModal() : setActiveModal(item.key)}
                disabled={item.key === 'export' && exporting}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.iconBg}`}>
                  {item.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <p className="text-xs text-zinc-400">{item.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500" />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {exportError && (
        <p className="mt-2 text-xs text-red-400">{exportError}</p>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal overlay */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={activeModal === 'import' ? closeImportModal : activeModal === 'backup' ? closeBackupModal : closeModal}
        >
          <Card
            className="w-full max-w-3xl overflow-hidden !p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-[540px]">
              {/* Left column - logo panel */}
              <div className="relative w-2/4 bg-zinc-800">
                <img
                  src="/Kavach-Logo.png"
                  alt="Kavach"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* Right column - content */}
              <div className="relative flex flex-1 flex-col justify-center overflow-y-auto p-8">
                <button
                  onClick={activeModal === 'import' ? closeImportModal : activeModal === 'backup' ? closeBackupModal : closeModal}
                  className="absolute right-3 top-3 rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Change password */}
                {activeModal === 'password' && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-center font-bold underline text-kavach-500">
                        Change master password
                      </CardTitle>
                      <p className="mt-1 text-sm text-zinc-400">
                        After changing, you will be logged out and must unlock with the new password.
                      </p>
                    </CardHeader>

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
                  </>
                )}

                {/* Authenticator app */}
                {activeModal === 'totp' && (
                  <>
                    <CardHeader>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <SmartphoneNfc className="h-5 w-5 text-kavach-500" />
                        <CardTitle className="text-center font-bold underline text-kavach-500">
                          Authenticator app
                        </CardTitle>
                      </div>
                      <p className="text-center text-sm text-zinc-400">
                        Reset your TOTP secret and re-enroll a new authenticator app. Use this if
                        you lose access to your current authenticator.
                      </p>
                    </CardHeader>

                    {totpStep === 'idle' && (
                      <div className="flex justify-center">
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
                        <p className="text-sm text-zinc-300">
                          Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
                        </p>
                        <div className="flex justify-center">
                          <div className="rounded-lg border border-zinc-700 bg-white p-3">
                            <QRCodeSVG value={totpData.qrCodeUri} size={150} />
                          </div>
                        </div>
                        <details className="text-xs text-zinc-500">
                          <summary className="cursor-pointer select-none">Can't scan? Enter manually</summary>
                          <div className="mt-2 rounded bg-zinc-800 px-3 py-2">
                            <div className="mb-1 flex items-center gap-1 text-zinc-500">
                              <span>Secret key</span>
                              <div className="group relative">
                                <Info className="h-3 w-3 cursor-help" />
                                <div className="absolute bottom-full left-1/2 mb-2 hidden w-56 -translate-x-1/2 rounded bg-zinc-700 px-3 py-2 text-xs text-zinc-200 shadow-lg group-hover:block">
                                  A shared key between Kavach and your authenticator app. It generates
                                  the same time-based codes as the QR code above. Keep it private.
                                </div>
                              </div>
                            </div>
                            <p className="break-all font-mono text-zinc-300">{totpData.secret}</p>
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
                        <p className="text-sm text-green-400">
                          Authenticator reset successfully. Your new app is now active.
                        </p>
                        <Button variant="secondary" onClick={closeModal}>
                          Done
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Import vault */}
                {activeModal === 'import' && (
                  <>
                    <CardHeader>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <Upload className="h-5 w-5 text-kavach-500" />
                        <CardTitle className="text-center font-bold underline text-kavach-500">
                          Import vault
                        </CardTitle>
                      </div>
                      <p className="text-center text-sm text-zinc-400">
                        Select a Kavach export file. Credentials that already exist will be skipped.
                      </p>
                    </CardHeader>

                    {importResult ? (
                      <div className="space-y-4 text-center">
                        <p className="text-sm text-green-400">
                          Import complete: {importResult.imported} added
                          {importResult.skipped > 0 && `, ${importResult.skipped} skipped (already exist)`}.
                        </p>
                        <Button variant="secondary" onClick={closeImportModal}>Done</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        {importError && (
                          <p className="text-xs text-red-400">{importError}</p>
                        )}
                        <Button
                          variant="secondary"
                          loading={importMutation.isPending}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mr-1.5 h-4 w-4" />
                          Choose file
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Backup destination */}
                {activeModal === 'backup' && (
                  <>
                    <CardHeader>
                      <div className="mb-2 flex items-center justify-center gap-2">
                        <FolderOpen className="h-5 w-5 text-kavach-500" />
                        <CardTitle className="text-center font-bold underline text-kavach-500">
                          Backup destination
                        </CardTitle>
                      </div>
                      <p className="text-center text-sm text-zinc-400">
                        On each startup, Kavach copies your database to this folder. Leave blank to disable automatic backups.
                      </p>
                    </CardHeader>

                    <div className="space-y-4">
                      <Input
                        id="backup-path"
                        label="Folder path"
                        type="text"
                        placeholder="e.g. D:\Backups or /Volumes/USB"
                        value={backupPath}
                        onChange={(e) => { setBackupPath(e.target.value); setBackupStatus(null); setBackupError(null) }}
                      />

                      {backupStatus && <p className="text-xs text-green-400">{backupStatus}</p>}
                      {backupError && <p className="text-xs text-red-400">{backupError}</p>}

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
                  </>
                )}

                {/* Theme picker */}
                {activeModal === 'theme' && (
                  <>
                    <CardHeader>
                      <CardTitle className="text-center font-bold underline text-kavach-500">
                        Choose theme
                      </CardTitle>
                      <p className="mt-1 text-center text-sm text-zinc-400">
                        Select an accent colour applied across the entire app.
                      </p>
                    </CardHeader>

                    <div className="grid grid-cols-3 gap-4">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setTheme(t.id); closeModal() }}
                          className="flex flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-zinc-800"
                        >
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: t.color }}
                          >
                            {theme === t.id && (
                              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className="text-xs text-zinc-300">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
