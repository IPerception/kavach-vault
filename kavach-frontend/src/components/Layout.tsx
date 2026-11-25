import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, Home, ListChecks, LockKeyhole, Moon, Settings, Sun } from 'lucide-react'
import { useKavachStore } from '../store/useKavachStore'
import { useInactivityWatcher } from '../hooks/useInactivityWatcher'
import { useVaultAttention } from '../hooks/useVaultAttention'
import { tagCounts } from '../lib/attention'
import { AutoLockTimer } from './AutoLockTimer'
import { ExpiryBanner } from './ExpiryBanner'
import { Button } from './ui/Button'
import { IconButton } from './ui/IconButton'
import { cn } from './ui/cn'
import { Wordmark } from './brand/Wordmark'

// useInactivityWatcher subscribes to the whole store, and every mousemove updates it.
// Isolating it here keeps those re-renders out of the layout.
function InactivityWatcher() {
  useInactivityWatcher()
  return null
}

const navLinkClass = (active: boolean) =>
  cn(
    'flex items-center gap-2.5 rounded-full px-3 py-[7px] transition-colors',
    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-nav-active font-medium text-text' : 'text-soft hover:bg-nav-active/60 hover:text-text',
  )

function NavItem({
  to,
  icon,
  label,
  count,
  countClassName,
}: {
  to: string
  icon: ReactNode
  label: string
  count?: number
  countClassName?: string
}) {
  return (
    <NavLink to={to} className={({ isActive }) => navLinkClass(isActive)}>
      {icon}
      <span className="grow">{label}</span>
      {count !== undefined && (
        <span className={cn('font-mono text-2xs text-muted', countClassName)}>{count}</span>
      )}
    </NavLink>
  )
}

export function Layout() {
  const colorMode = useKavachStore((s) => s.colorMode)
  const setColorMode = useKavachStore((s) => s.setColorMode)
  const doLogout = useKavachStore((s) => s.doLogout)
  const { pathname, search } = useLocation()
  const { credentials, summary } = useVaultAttention()

  const tags = tagCounts(credentials)
  const activeTag = pathname === '/dashboard' ? new URLSearchParams(search).get('tag') : null
  const nextMode = colorMode === 'dark' ? 'light' : 'dark'
  const iconClass = 'h-[15px] w-[15px] shrink-0'

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <InactivityWatcher />
      <div className="flex flex-1 flex-wrap">
        <nav
          aria-label="Vault sections"
          className="flex flex-[1_1_212px] flex-col gap-[18px] border-r border-border bg-side px-2.5 py-4 max-md:max-w-full md:max-w-[212px]"
        >
          <Link
            to="/dashboard"
            className="rounded-control px-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark size={32} className="gap-2" nameClassName="text-lg" tagline="Personal Password Manager" />
          </Link>
          {/* Gold rules only at group breaks (brand | nav | tags), not under every item. */}
          <div aria-hidden="true" className="gold-line -my-1.5" />

          <div className="flex flex-col gap-0.5">
            <NavItem to="/dashboard" icon={<Home className={iconClass} aria-hidden="true" />} label="Vault" count={credentials.length} />
            <NavItem
              to="/health"
              icon={<Activity className={iconClass} aria-hidden="true" />}
              label="Health"
              count={summary.counts.attention}
              countClassName={summary.counts.attention > 0 ? 'text-fair-text' : undefined}
            />
            <NavItem to="/audit" icon={<ListChecks className={iconClass} aria-hidden="true" />} label="Audit log" />
            <NavItem to="/settings" icon={<Settings className={iconClass} aria-hidden="true" />} label="Settings" />
          </div>

          {tags.length > 0 && <div aria-hidden="true" className="gold-line -my-1.5" />}

          {tags.length > 0 && (
            <div className="flex flex-col gap-px">
              <span className="px-3 pb-1.5 text-2xs uppercase tracking-[0.08em] text-muted">Tags</span>
              {tags.map(({ tag, count }) => (
                <Link
                  key={tag}
                  to={`/dashboard?tag=${encodeURIComponent(tag)}`}
                  aria-current={activeTag === tag ? 'true' : undefined}
                  className={cn(
                    'flex gap-2 rounded-full px-3 py-[5px] font-mono text-xs transition-colors',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                    activeTag === tag ? 'bg-nav-active text-text' : 'text-soft hover:bg-nav-active/60 hover:text-text',
                  )}
                >
                  <span className="text-muted">#</span>
                  {tag}
                  <span className="ml-auto text-muted">{count}</span>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2.5 rounded-panel border border-border bg-panel p-3">
            <AutoLockTimer className="font-mono text-2xs text-muted" />
            <div className="flex gap-1.5">
              <Button variant="secondary" size="sm" className="grow" onClick={() => void doLogout()}>
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Lock
              </Button>
              <IconButton
                label={`Switch to ${nextMode} mode`}
                size={32}
                className="border-border bg-raised"
                onClick={() => setColorMode(nextMode)}
              >
                {colorMode === 'dark' ? (
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </IconButton>
            </div>
          </div>
        </nav>

        <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 px-5 pb-3 pt-[18px]">
          <ExpiryBanner />
          <Outlet />
        </main>
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-side px-4 py-1.5 font-mono text-2xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full bg-ok-bar" aria-hidden="true" />
          unlocked
        </span>
        <AutoLockTimer prefix="auto-lock" />
        <span>
          {credentials.length} {credentials.length === 1 ? 'item' : 'items'}
        </span>
        <span>AES-256-GCM</span>
        <span>v{__APP_VERSION__}</span>
        <span>{window.location.origin}</span>
        <span>local only</span>
      </footer>
    </div>
  )
}
