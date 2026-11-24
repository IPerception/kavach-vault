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
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kavach-500/10">
          <ArrowUpCircle className="h-5 w-5 text-kavach-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Updates</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
      <p role="status" aria-live="polite" className="mt-3 text-xs text-zinc-700 empty:hidden dark:text-zinc-300">
        <StatusMessage status={status} />
      </p>
    </Card>
  )
}
