import { useQuery } from '@tanstack/react-query'
import { listCredentials } from '../api/credentials'
import type { CredentialSummary } from '../api/types'

export const EXPIRY_DAYS_KEY = 'kavach_expiry_days'
export const EXPIRY_WARNING_KEY = 'kavach_expiry_warning_days'
export const DEFAULT_EXPIRY_DAYS = 90
export const DEFAULT_WARNING_DAYS = 14

export function getExpiryDays(): number {
  return parseInt(localStorage.getItem(EXPIRY_DAYS_KEY) ?? String(DEFAULT_EXPIRY_DAYS))
}

export function getWarningDays(): number {
  return parseInt(localStorage.getItem(EXPIRY_WARNING_KEY) ?? String(DEFAULT_WARNING_DAYS))
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export interface ExpiryCheckResult {
  expired: CredentialSummary[]
  expiringSoon: CredentialSummary[]
  expiryDays: number
  warningDays: number
}

export function useExpiryCheck(): ExpiryCheckResult {
  const expiryDays = getExpiryDays()
  const warningDays = getWarningDays()

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
  })

  const passwords = credentials.filter((c) => c.credentialType !== 'NOTE')

  const expired = passwords.filter((c) => daysSince(c.updatedAt) >= expiryDays)
  const expiringSoon = passwords.filter((c) => {
    const days = daysSince(c.updatedAt)
    return days >= expiryDays - warningDays && days < expiryDays
  })

  return { expired, expiringSoon, expiryDays, warningDays }
}
