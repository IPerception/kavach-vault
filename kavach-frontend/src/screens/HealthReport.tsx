import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, ShieldAlert, Copy, Clock, Pencil, Flame, Wifi } from 'lucide-react'
import { checkBreaches } from '../api/credentials'
import { useVaultHealth } from '../hooks/useVaultHealth'
import { isStale, passwordAgeDate, strengthBucket, type StrengthBucket } from '../lib/attention'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../components/ui/Dialog'
import { cn } from '../components/ui/cn'
import type { BreachResult, CredentialHealth } from '../api/types'
import { getExpiryDays } from '../hooks/useExpiryCheck'
import { itemLinkState } from '../lib/itemRoutes'

const STALE_DAYS = getExpiryDays()

type IssueTone = 'ok' | 'fair' | 'weak' | 'neutral'

const STRENGTH_TONE: Record<StrengthBucket, IssueTone> = {
  weak: 'weak',
  fair: 'fair',
  strong: 'ok',
}

function issueTags(c: CredentialHealth) {
  const tags: { label: string; tone: IssueTone }[] = []
  if (strengthBucket(c.strengthScore) === 'weak') tags.push({ label: c.strengthLabel, tone: 'weak' })
  if (c.duplicate) tags.push({ label: 'Duplicate', tone: 'fair' })
  if (isStale(passwordAgeDate(c), STALE_DAYS)) tags.push({ label: 'Stale', tone: 'neutral' })
  return tags
}

export function HealthReport() {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: items = [], isLoading } = useVaultHealth()

  const breachMutation = useMutation({ mutationFn: checkBreaches })

  const breachMap = new Map<number, BreachResult>(
    (breachMutation.data ?? []).map((r) => [r.id, r])
  )
  const breachedCount = (breachMutation.data ?? []).filter((r) => r.breached).length

  function handleConfirmCheck() {
    setConfirmOpen(false)
    breachMutation.mutate()
  }

  if (isLoading) return <p className="text-sm text-soft">Analysing vault...</p>

  const weak = items.filter((c) => strengthBucket(c.strengthScore) === 'weak').length
  const dupes = items.filter((c) => c.duplicate).length
  const stale = items.filter((c) => isStale(passwordAgeDate(c), STALE_DAYS)).length
  const totalIssues = items.filter((c) => issueTags(c).length > 0).length

  return (
    <div className="space-y-6">
      <div className="rule-gold flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold text-text">Password health</h1>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              loading={breachMutation.isPending}
              disabled={breachMutation.isPending}
            >
              <Flame className="h-3.5 w-3.5 text-weak-text" aria-hidden="true" />
              Check breaches
            </Button>
          </DialogTrigger>
          <DialogContent>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-bg">
                <Wifi className="h-5 w-5 text-warn-text" aria-hidden="true" />
              </div>
              <DialogTitle className="text-base font-semibold text-text">
                External request required
              </DialogTitle>
            </div>
            <DialogDescription className="mb-5 text-sm leading-relaxed text-soft">
              To check for breaches, Kavach will contact{' '}
              <span className="font-medium text-text">api.pwnedpasswords.com</span>.
              <br /><br />
              Only the <span className="font-medium text-text">first 5 characters</span> of
              a SHA-1 hash of each password are transmitted. Your actual passwords never leave this device.
              <br /><br />
              This is the industry-standard{' '}
              <span className="font-medium text-text">k-anonymity</span> model used
              by password managers like 1Password and Bitwarden.
            </DialogDescription>
            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
              <Button size="sm" onClick={handleConfirmCheck}>
                Continue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<ShieldCheck className="h-4 w-4 text-ok-text" aria-hidden="true" />}
          value={items.length} label="total" />
        <Stat icon={<ShieldAlert className="h-4 w-4 text-weak-text" aria-hidden="true" />}
          value={weak} label="weak" highlight={weak > 0} />
        <Stat icon={<Copy className="h-4 w-4 text-fair-text" aria-hidden="true" />}
          value={dupes} label="duplicates" highlight={dupes > 0} />
        <Stat icon={<Clock className="h-4 w-4 text-muted" aria-hidden="true" />}
          value={stale} label={`stale >${STALE_DAYS}d`} highlight={stale > 0} />
        {breachMutation.isSuccess && (
          <Stat icon={<Flame className="h-4 w-4 text-weak-text" aria-hidden="true" />}
            value={breachedCount} label="breached" highlight={breachedCount > 0} />
        )}
      </div>

      {breachMutation.isError && (
        <p role="alert" className="text-sm text-weak-text">
          Breach check failed -- the request to api.pwnedpasswords.com may have timed out. Try again.
        </p>
      )}

      {breachMutation.isSuccess && breachedCount === 0 && totalIssues === 0 && (
        <p className="text-sm text-ok-text">No breached passwords found.</p>
      )}

      {totalIssues === 0 && !breachMutation.isSuccess ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ok-bar/15">
            <ShieldCheck className="h-8 w-8 text-ok-text" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-text">All credentials look healthy</p>
          <p className="mt-1 text-sm text-muted">No weak, duplicate, or stale passwords found.</p>
        </Card>
      ) : (
        (totalIssues > 0 || breachedCount > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>
                {totalIssues} credential{totalIssues !== 1 ? 's' : ''} need attention
                {breachMutation.isSuccess && breachedCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-weak-text">
                    + {breachedCount} breached
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
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

function Stat({
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
      className={cn(
        'flex items-center gap-2 rounded-panel border px-3 py-2.5',
        highlight ? 'border-accent-line bg-nav-active' : 'border-border bg-panel',
      )}
    >
      {icon}
      <div>
        <p className="font-mono text-sm font-semibold text-text">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  )
}

function CredentialRow({ item, breach }: { item: CredentialHealth; breach?: BreachResult }) {
  const location = useLocation()
  const tags = issueTags(item)
  return (
    <li className="flex items-center justify-between px-1 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-text">{item.purpose}</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={STRENGTH_TONE[strengthBucket(item.strengthScore)]}>{item.strengthLabel}</Chip>
          {tags
            .filter((t) => t.label !== item.strengthLabel)
            .map((t) => (
              <Chip key={t.label} tone={t.tone}>{t.label}</Chip>
            ))}
          {breach?.breached && (
            <Chip tone="weak">
              <Flame className="h-3 w-3" aria-hidden="true" />
              Breached{breach.count > 0 ? ` (${breach.count.toLocaleString()}x)` : ''}
            </Chip>
          )}
        </div>
      </div>
      <Link
        to={`/edit/${item.id}`}
        state={itemLinkState(location)}
        aria-label={`Edit ${item.purpose}`}
        className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-control text-soft transition-colors hover:bg-row-hover hover:text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </li>
  )
}
