import { useCallback, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { backgroundOf } from '../lib/itemRoutes'
import { Dialog, DialogContent, DialogTitle } from './ui/Dialog'

/**
 * Closes the item dialog and returns to the screen underneath. Opened from inside the app
 * it goes back one history entry (the background), so Back and Close behave the same and
 * no duplicate entry is left behind. Opened directly (typed URL, refresh) there is no
 * entry to go back to, so it replaces the URL with the dashboard.
 */
export function useItemDialogClose() {
  const navigate = useNavigate()
  const location = useLocation()
  const fromApp = backgroundOf(location) !== undefined
  return useCallback(() => {
    if (fromApp) navigate(-1)
    else navigate('/dashboard', { replace: true })
  }, [fromApp, navigate])
}

interface ItemDialogProps {
  title: string
  /** Right side of the header: the Password / Secure note switch, or Delete. */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Cancel / Save row of an item form, pinned to the bottom of the dialog: on a short window
 * the fields scroll underneath while the buttons stay visible. The negative margins and
 * -bottom-6 cancel the dialog's p-6 so the bar sits flush with its edges.
 */
export function ItemDialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-6 -mx-6 -mb-6 flex justify-end gap-2 border-t border-border bg-panel px-6 py-3">
      {children}
    </div>
  )
}

/** Shell for the New item and Edit forms: always open while its route is active. */
export function ItemDialog({ title, actions, children }: ItemDialogProps) {
  const close = useItemDialogClose()
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] max-w-lg overflow-y-auto">
        {/* pr-8 keeps the header clear of the dialog's Close (X) button. */}
        <div className="rule-gold mb-5 flex flex-wrap items-center justify-between gap-3 pr-8">
          <DialogTitle className="font-display text-xl font-semibold text-text">{title}</DialogTitle>
          {actions}
        </div>
        {children}
      </DialogContent>
    </Dialog>
  )
}
