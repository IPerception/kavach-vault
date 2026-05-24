import client from './client'
import type { AuditLogEntry, Page } from './types'

export const getAuditLog = (page = 0, size = 25) =>
  client
    .get<Page<AuditLogEntry>>('/audit-log', { params: { page, size, sort: 'timestamp,desc' } })
    .then((r) => r.data)
