import client from './client'

export const getBackupDestination = () =>
  client.get<{ destination: string }>('/settings/backup').then((r) => r.data)

export const setBackupDestination = (destination: string) =>
  client.put('/settings/backup', { destination })

export const clearBackupDestination = () =>
  client.delete('/settings/backup')

export const runBackupNow = () =>
  client.post<{ path: string }>('/settings/backup/run').then((r) => r.data)
