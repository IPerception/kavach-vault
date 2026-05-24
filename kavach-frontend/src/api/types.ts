export interface VaultStatus {
  initialized: boolean
}

export interface CredentialSummary {
  id: number
  purpose: string
  username?: string
  url?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface RevealResponse {
  password: string
}

export interface AuditLogEntry {
  id: number
  action: string
  purpose: string | null
  timestamp: string
  ipAddress: string | null
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ProblemDetail {
  status: number
  title: string
  detail: string
}

export interface CredentialHealth {
  id: number
  purpose: string
  strengthScore: 0 | 1 | 2 | 3 | 4
  strengthLabel: string
  duplicate: boolean
  updatedAt: string
}

export interface VaultExport {
  version: number
  data: string
}

export interface ImportResult {
  imported: number
  skipped: number
}

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger'

export interface TotpSetupData {
  secret: string
  qrCodeUri: string
}
