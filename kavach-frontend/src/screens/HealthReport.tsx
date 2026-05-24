import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, ShieldAlert, Copy, Clock, Pencil } from 'lucide-react'
import { getHealthReport } from '../api/credentials'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { CredentialHealth } from '../api/types'

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
    tags.push({ label: 'Stale', className: 'text-zinc-400 bg-zinc-700/50' })
  return tags
}

export function HealthReport() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['health-report'],
    queryFn: getHealthReport,
  })

  if (isLoading) return <p className="text-sm text-zinc-400">Analysing vault...</p>

  const weak = items.filter((c) => c.strengthScore <= 1).length
  const dupes = items.filter((c) => c.duplicate).length
  const stale = items.filter((c) => daysSince(c.updatedAt) >= STALE_DAYS).length
  const totalIssues = items.filter((c) => issueTags(c).length > 0).length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Vault</p>
        <h1 className="mt-0.5 text-2xl font-bold text-kavach-500">Password Health</h1>
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
      </div>

      {totalIssues === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <ShieldCheck className="h-8 w-8 text-green-400" />
          </div>
          <p className="text-base font-semibold text-zinc-200">All credentials look healthy</p>
          <p className="mt-1 text-sm text-zinc-500">No weak, duplicate, or stale passwords found.</p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-kavach-500">
              {totalIssues} credential{totalIssues !== 1 ? 's' : ''} need attention
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-zinc-800">
            {items
              .filter((c) => issueTags(c).length > 0)
              .map((c) => (
                <CredentialRow key={c.id} item={c} />
              ))}
          </ul>
        </Card>
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
        highlight ? 'border-kavach-500/30 bg-kavach-950/30' : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      {icon}
      <div>
        <p className="text-sm font-semibold text-zinc-100">{value}</p>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
    </div>
  )
}

function CredentialRow({ item }: { item: CredentialHealth }) {
  const tags = issueTags(item)
  return (
    <li className="flex items-center justify-between py-3 px-1">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-zinc-100">{item.purpose}</p>
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
