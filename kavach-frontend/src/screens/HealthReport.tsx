import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { ShieldCheck, ShieldAlert, Copy, Clock, Pencil, Flame, Wifi } from 'lucide-react'
import { getHealthReport, checkBreaches } from '../api/credentials'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { BreachResult, CredentialHealth } from '../api/types'

const STALE_DAYS = 90

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

const STRENGTH_COLOR: Record<number, string> = {
  0: 'text-red-400 bg-red-500/10',
  1: 'text-orange-400 bg-orange-500/10',
  2: 'text-yellow-400 bg-yellow-400/10',
  3: 'text-blue-400 bg-blue-500/10',
  4: 'text-green-400 bg-green-500/10',
}

function issueTags(c: CredentialHealth) {
  const tags: { label: string; className: string }[] = []
  if (c.strengthScore <= 1)
    tags.push({ label: c.strengthLabel, className: 'text-red-400 bg-red-500/10' })
  if (c.duplicate)
    tags.push({ label: 'Duplicate', className: 'text-orange-400 bg-orange-500/10' })
  if (daysSince(c.updatedAt) >= STALE_DAYS)
    tags.push({ label: 'Stale', className: 'text-zinc-600 bg-zinc-200/80 dark:text-zinc-400 dark:bg-zinc-700/50' })
  return tags
}

export function HealthReport() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['health-report'],
    queryFn: getHealthReport,
  })

  const breachMutation = useMutation({ mutationFn: checkBreaches })

  const breachMap = new Map<number, BreachResult>(
    (breachMutation.data ?? []).map((r) => [r.id, r])
  )
  const breachedCount = (breachMutation.data ?? []).filter((r) => r.breached).length

  function handleConfirmCheck() {
    setConfirmOpen(false)
    breachMutation.mutate()
  }

  if (isLoading) return <p className="text-sm text-zinc-400">Analysing vault...</p>

  const weak = items.filter((c) => c.strengthScore <= 1).length
  const dupes = items.filter((c) => c.duplicate).length
  const stale = items.filter((c) => daysSince(c.updatedAt) >= STALE_DAYS).length
  const totalIssues = items.filter((c) => issueTags(c).length > 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Vault</p>
          <h1 className="mt-0.5 text-2xl font-bold text-kavach-500">Password Health</h1>
        </div>
        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Trigger asChild>
            <Button
              variant="secondary"
              size="sm"
              loading={breachMutation.isPending}
              disabled={breachMutation.isPending}
            >
              <Flame className="mr-1.5 h-3.5 w-3.5 text-orange-400" />
              Check breaches
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                  <Wifi className="h-5 w-5 text-orange-400" />
                </div>
                <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  External request required
                </Dialog.Title>
              </div>
              <Dialog.Description className="mb-5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                To check for breaches, Kavach will contact{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">api.pwnedpasswords.com</span>.
                <br /><br />
                Only the <span className="font-medium text-zinc-800 dark:text-zinc-200">first 5 characters</span> of
                a SHA-1 hash of each password are transmitted. Your actual passwords never leave this device.
                <br /><br />
                This is the industry-standard{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">k-anonymity</span> model used
                by password managers like 1Password and Bitwarden.
              </Dialog.Description>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm">Cancel</Button>
                </Dialog.Close>
                <Button size="sm" onClick={handleConfirmCheck}>
                  Continue
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Chip icon={<ShieldCheck className="h-4 w-4 text-green-400" />}
          value={items.length} label="total" />
        <Chip icon={<ShieldAlert className="h-4 w-4 text-red-400" />}
          value={weak} label="weak" highlight={weak > 0} />
        <Chip icon={<Copy className="h-4 w-4 text-orange-400" />}
          value={dupes} label="duplicates" highlight={dupes > 0} />
        <Chip icon={<Clock className="h-4 w-4 text-zinc-400" />}
          value={stale} label={`stale >${STALE_DAYS}d`} highlight={stale > 0} />
        {breachMutation.isSuccess && (
          <Chip icon={<Flame className="h-4 w-4 text-orange-400" />}
            value={breachedCount} label="breached" highlight={breachedCount > 0} />
        )}
      </div>

      {breachMutation.isError && (
        <p className="text-sm text-red-400">
          Breach check failed -- the request to api.pwnedpasswords.com may have timed out. Try again.
        </p>
      )}

      {breachMutation.isSuccess && breachedCount === 0 && totalIssues === 0 && (
        <p className="text-sm text-green-400">No breached passwords found.</p>
      )}

      {totalIssues === 0 && !breachMutation.isSuccess ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <ShieldCheck className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-200">All credentials look healthy</p>
          <p className="mt-1 text-sm text-zinc-500">No weak, duplicate, or stale passwords found.</p>
        </Card>
      ) : (
        (totalIssues > 0 || breachedCount > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-kavach-500">
                {totalIssues} credential{totalIssues !== 1 ? 's' : ''} need attention
                {breachMutation.isSuccess && breachedCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-orange-400">
                    + {breachedCount} breached
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items
                .filter((c) => issueTags(c).length > 0 || breachMap.get(c.id)?.breached)
                .map((c) => (
                  <CredentialRow key={c.id} item={c} breach={breachMap.get(c.id)} />
                ))}
            </ul>
          </Card>
        )
      )}

    </div>
  )
}

function Chip({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode
  value: number
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${
        highlight ? 'border-kavach-500/30 bg-kavach-950/30' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      {icon}
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

function CredentialRow({ item, breach }: { item: CredentialHealth; breach?: BreachResult }) {
  const tags = issueTags(item)
  return (
    <li className="flex items-center justify-between py-3 px-1">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.purpose}</p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
              STRENGTH_COLOR[item.strengthScore]
            }`}
          >
            {item.strengthLabel}
          </span>
          {tags
            .filter((t) => t.label !== item.strengthLabel)
            .map((t) => (
              <span
                key={t.label}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${t.className}`}
              >
                {t.label}
              </span>
            ))}
          {breach?.breached && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-orange-400 bg-orange-500/10">
              <Flame className="h-3 w-3" />
              Breached{breach.count > 0 ? ` (${breach.count.toLocaleString()}x)` : ''}
            </span>
          )}
        </div>
      </div>
      <Link to={`/edit/${item.id}`}>
        <Button size="sm" variant="ghost" aria-label="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </li>
  )
}
