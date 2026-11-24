import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listCredentials } from '../api/credentials'
import { summarize } from '../lib/attention'
import { getExpiryDays } from './useExpiryCheck'
import { useVaultHealth } from './useVaultHealth'

/**
 * The credential list joined with the health report. Health is optional: while it loads,
 * or if it fails (e.g. no session key after a server restart), the weak count is dropped
 * and only staleness is counted. Callers are never blocked on it.
 */
export function useVaultAttention() {
  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
  })
  const { data: health } = useVaultHealth()

  const healthById = useMemo(
    () => (health ? new Map(health.map((h) => [h.id, h])) : undefined),
    [health],
  )
  const expiryDays = getExpiryDays()
  const summary = summarize(credentials, healthById, expiryDays)

  return { credentials, isLoading, healthById, summary, expiryDays }
}
