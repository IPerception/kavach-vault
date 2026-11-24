import { ArrowUpCircle } from 'lucide-react'
import { RELEASES_PAGE, useUpdateCheck, type UpdateStatus } from '../hooks/useUpdateCheck'
import { Card } from './ui/Card'
import { Button } from './ui/Button'

function StatusMessage({ status }: { status: UpdateStatus }) {
  switch (status.state) {
    case 'current':
      return <>You have the latest version.</>
    case 'available':
      return (
        <>
          Kavach <span className="font-semibold">{status.version}</span> is available.{' '}
          <a href={RELEASES_PAGE} target="_blank" rel="noopener noreferrer" className="underline">
            Download
          </a>
        </>
      )
    case 'error':
      return <>Could not reach GitHub. Try again later.</>
    default:
      return null
  }
}

/** Settings card: checks GitHub for a newer release only when the button is clicked. */
export function UpdateCheck() {
  const { status, check } = useUpdateCheck()

  return (
    <Card className="mt-4 max-w-lg px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-control bg-raised">
          <ArrowUpCircle className="h-5 w-5 text-accent-text" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text">Updates</p>
          <p className="text-xs text-soft">
            You are on Kavach {__APP_VERSION__}. Checking contacts GitHub.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={check}
          loading={status.state === 'checking'}
        >
          Check for updates
        </Button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-xs text-soft empty:hidden">
        <StatusMessage status={status} />
      </p>
    </Card>
  )
}
