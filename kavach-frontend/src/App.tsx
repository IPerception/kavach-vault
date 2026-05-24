import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getVaultStatus } from './api/auth'
import { useKavachStore } from './store/useKavachStore'
import { Layout } from './components/Layout'
import { SetupWizard } from './screens/SetupWizard'
import { LockScreen } from './screens/LockScreen'
import { Dashboard } from './screens/Dashboard'
import { AddCredential } from './screens/AddCredential'
import { EditCredential } from './screens/EditCredential'
import { AuditLog } from './screens/AuditLog'
import { Settings } from './screens/Settings'
import { HealthReport } from './screens/HealthReport'

function PrivateRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="add" element={<AddCredential />} />
        <Route path="edit/:id" element={<EditCredential />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="health" element={<HealthReport />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export function App() {
  const { status, setStatus } = useKavachStore()

  const { data } = useQuery({
    queryKey: ['vault-status'],
    queryFn: getVaultStatus,
    retry: false,
  })

  useEffect(() => {
    if (data === undefined) return
    if (status !== 'loading') return   // only auto-transition on initial load
    setStatus(data.initialized ? 'locked' : 'setup')
  }, [data, status, setStatus])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-kavach-400" />
      </div>
    )
  }

  if (status === 'setup') return <SetupWizard />
  if (status === 'locked') return <LockScreen />

  return <PrivateRoutes />
}
