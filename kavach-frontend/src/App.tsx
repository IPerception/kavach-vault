import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, ServerOff } from 'lucide-react'
import { Button } from './components/ui/Button'
import { getVaultStatus } from './api/auth'
import { useKavachStore } from './store/useKavachStore'
import { Layout } from './components/Layout'
import { SetupWizard } from './screens/SetupWizard'
import { LockScreen } from './screens/LockScreen'
import { Dashboard } from './screens/Dashboard'
import { AddCredential } from './screens/AddCredential'
import { EditCredential } from './screens/EditCredential'
import { AddNote } from './screens/AddNote'
import { EditNote } from './screens/EditNote'
import { AuditLog } from './screens/AuditLog'
import { Settings } from './screens/Settings'
import { HealthReport } from './screens/HealthReport'

function BackendUnreachable({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div role="alert" className="w-full max-w-sm space-y-4 text-center">
        <ServerOff className="mx-auto h-10 w-10 text-zinc-500" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-zinc-100">Can't reach Kavach</h1>
        <p className="text-sm text-zinc-400">
          The Kavach service isn't responding. If you started Kavach.exe, check its console
          window for errors, or restart it.
        </p>
        <Button onClick={onRetry} loading={retrying}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </div>
  )
}

function PrivateRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="add" element={<AddCredential />} />
        <Route path="edit/:id" element={<EditCredential />} />
        <Route path="add-note" element={<AddNote />} />
        <Route path="edit-note/:id" element={<EditNote />} />
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

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ['vault-status'],
    queryFn: getVaultStatus,
    retry: false,
  })

  useEffect(() => {
    if (data === undefined) return
    if (status !== 'loading') return   // only auto-transition on initial load
    setStatus(data.initialized ? 'locked' : 'setup')
  }, [data, status, setStatus])

  // Without this, a failed status check left the spinner below up forever:
  // nothing else ever moves `status` off 'loading' when the backend is down.
  if (status === 'loading' && isError) {
    return <BackendUnreachable retrying={isFetching} onRetry={() => refetch()} />
  }

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
