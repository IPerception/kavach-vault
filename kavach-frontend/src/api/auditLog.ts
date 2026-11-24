import client from './client'
import type { AuditLogEntry, Page } from './types'

/** Matches AuditLogController @PageableDefault(size = 20). */
export const AUDIT_PAGE_SIZE = 20

export const getAuditLog = (page = 0, size = AUDIT_PAGE_SIZE) =>
  client
    .get<Page<AuditLogEntry>>('/audit-log', { params: { page, size, sort: 'timestamp,desc' } })
    .then((r) => r.data)
