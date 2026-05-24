import client from './client'
import type { CredentialHealth, CredentialSummary, ImportResult, RevealResponse, VaultExport } from './types'

interface CreateCredentialBody {
  purpose: string
  username?: string
  password: string
  url?: string
  notes?: string
}

interface UpdateCredentialBody {
  username?: string
  password?: string
  url?: string
  notes?: string
}

export const listCredentials = () =>
  client.get<CredentialSummary[]>('/credentials').then((r) => r.data)

export const createCredential = (body: CreateCredentialBody) =>
  client.post<CredentialSummary>('/credentials', body).then((r) => r.data)

export const updateCredential = (id: number, body: UpdateCredentialBody) =>
  client.put<CredentialSummary>(`/credentials/${id}`, body).then((r) => r.data)

export const deleteCredential = (id: number) => client.delete(`/credentials/${id}`)

export const revealPassword = (id: number, code: string) =>
  client.post<RevealResponse>(`/credentials/${id}/reveal`, { otp: code }).then((r) => r.data)

export const getHealthReport = () =>
  client.get<CredentialHealth[]>('/credentials/health').then((r) => r.data)

export const exportVault = () =>
  client.get<VaultExport>('/credentials/export').then((r) => r.data)

export const importVault = (payload: VaultExport) =>
  client.post<ImportResult>('/credentials/import', payload).then((r) => r.data)
