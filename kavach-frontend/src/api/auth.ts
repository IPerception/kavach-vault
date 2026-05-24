import client from './client'
import type { TotpSetupData, VaultStatus } from './types'

export const getVaultStatus = () =>
  client.get<VaultStatus>('/auth/status').then((r) => r.data)

export const register = (body: { username: string; email: string; password: string }) =>
  client.post('/auth/register', body)

export const login = (body: { username: string; password: string }) =>
  client.post('/auth/login', body)

export const logout = () => client.post('/auth/logout')

export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  client.put('/auth/change-password', body)

export const setupTotp = () =>
  client.post<TotpSetupData>('/auth/totp/setup').then((r) => r.data)

export const confirmTotp = (code: string) =>
  client.post('/auth/totp/confirm', { code })
