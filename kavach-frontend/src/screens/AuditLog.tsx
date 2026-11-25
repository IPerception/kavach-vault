import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AUDIT_PAGE_SIZE, getAuditLog } from '../api/auditLog'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Pagination } from '../components/ui/Pagination'
import type { BadgeVariant } from '../api/types'

const ACTION_BADGE: Record<string, BadgeVariant> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  VIEW: 'default',
}

export function AuditLog() {
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => getAuditLog(page),
    placeholderData: keepPreviousData,
  })

  if (isLoading) return <p className="text-sm text-soft">Loading...</p>

  const entries = data?.content ?? []

  return (
    <div className="space-y-6">
      <h1 className="rule-gold font-display text-xl font-semibold text-text">Audit log</h1>

      <Card className="p-0">
        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No audit entries yet.</p>
        )}

        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-row-hover">
              <Badge variant={ACTION_BADGE[entry.action] ?? 'default'} className="w-20 shrink-0 justify-center">
                {entry.action}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm text-text">
                {entry.purpose ?? <span className="text-muted">Account</span>}
              </span>
              <time dateTime={entry.timestamp} className="shrink-0 font-mono text-2xs text-muted">
                {new Date(entry.timestamp).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      </Card>

      <Pagination
        page={data?.number ?? page}
        pageSize={AUDIT_PAGE_SIZE}
        total={data?.totalElements ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
