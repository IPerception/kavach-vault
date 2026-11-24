import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { importCsv, importVault } from '../api/credentials'
import type { ImportResult, VaultExport } from '../api/types'
import { Button } from './ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/Dialog'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportError = { response?: { data?: { detail?: string } } }

/** Import a Kavach export (.json) or a Chrome/LastPass/Bitwarden CSV; shows the result counts in place. */
export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (payload: VaultExport) => importVault(payload),
    onSuccess: (result) => {
      setImportResult(result)
      qc.invalidateQueries({ queryKey: ['credentials'] })
    },
    onError: (err: ImportError) => {
      setImportError(err?.response?.data?.detail ?? 'Import failed. The file may be invalid or from a different vault.')
    },
  })

  const csvImportMutation = useMutation({
    mutationFn: (file: File) => importCsv(file),
    onSuccess: (result) => {
      setImportResult(result)
      qc.invalidateQueries({ queryKey: ['credentials'] })
    },
    onError: (err: ImportError) => {
      setImportError(err?.response?.data?.detail ?? 'Import failed. The file may be invalid or not a supported CSV format.')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setImportResult(null)
    if (file.name.toLowerCase().endsWith('.csv')) {
      csvImportMutation.mutate(file)
    } else {
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
    }
    e.target.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setImportResult(null)
      setImportError(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2 text-base font-semibold text-text">
          <Upload size={16} className="text-accent-text" aria-hidden="true" />
          Import vault
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-soft">
          Select a Kavach export (.json) or a CSV exported from Chrome, LastPass, or Bitwarden.
          Credentials that already exist will be skipped.
        </DialogDescription>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          aria-label="Import file"
          className="hidden"
          onChange={handleFileChange}
        />

        {importResult ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-ok-text">
              Import complete: {importResult.imported} added
              {importResult.skipped > 0 && `, ${importResult.skipped} skipped (already exist)`}.
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {importError && <p className="text-xs text-weak-text">{importError}</p>}
            <div className="flex justify-end">
              <Button
                variant="secondary"
                loading={importMutation.isPending || csvImportMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} aria-hidden="true" />
                Choose file
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
