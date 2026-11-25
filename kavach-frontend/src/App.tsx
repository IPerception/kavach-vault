import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, ServerOff } from 'lucide-react'
import { Button } from './components/ui/Button'
import { KavachMark } from './components/brand/KavachMark'
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
import { backgroundOf, isItemPath } from './lib/itemRoutes'

function BackendUnreachable({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div role="alert" className="w-full max-w-sm space-y-4 text-center">
        <KavachMark size={32} decorative className="mx-auto" />
        <ServerOff className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-text">Can't reach Kavach</h1>
        <p className="text-sm text-soft">
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

// The screens render at the background location while an item dialog (New item / Edit) is
// open, so the screen it was opened from stays visible and live underneath; on a direct
// load of an item URL that background is the dashboard. See lib/itemRoutes.ts.
export function PrivateRoutes() {
  const location = useLocation()
  const onItemPath = isItemPath(location.pathname)
  const screenLocation = onItemPath ? (backgroundOf(location) ?? '/dashboard') : location

  return (
    <>
      <Routes location={screenLocation}>
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="health" element={<HealthReport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
      {onItemPath && (
        <Routes>
          <Route path="add" element={<AddCredential />} />
          <Route path="add-note" element={<AddNote />} />
          <Route path="edit/:id" element={<EditCredential />} />
          <Route path="edit-note/:id" element={<EditNote />} />
        </Routes>
      )}
    </>
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    )
  }

  if (status === 'setup') return <SetupWizard />
  if (status === 'locked') return <LockScreen />

  return <PrivateRoutes />
}
