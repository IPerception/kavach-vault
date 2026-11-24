import { useQuery } from '@tanstack/react-query'
import { getHealthReport } from '../api/credentials'

// The key sits under 'credentials' on purpose: invalidateQueries({ queryKey: ['credentials'] })
// after an add, edit or import also refreshes health. Every call decrypts the whole vault
// server-side, so keep it fresh for 5 minutes and never refetch on window focus.
export function useVaultHealth() {
  return useQuery({
    queryKey: ['credentials', 'health'],
    queryFn: getHealthReport,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
