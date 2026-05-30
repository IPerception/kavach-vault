import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getAuditLog } from '../api/auditLog'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
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
  })

  if (isLoading) return <p className="text-sm text-zinc-400">Loading...</p>

  const entries = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-kavach-500">Audit log</CardTitle>
        </CardHeader>

        {entries.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">No audit entries yet.</p>
        )}

        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">
                  <Badge variant={ACTION_BADGE[entry.action] ?? 'default'} className="mr-2">
                    {entry.action}
                  </Badge>
                  {entry.purpose ?? <span className="text-zinc-500">Account</span>}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-400">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
