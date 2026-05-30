import { Link, NavLink, Outlet } from 'react-router-dom'
import { DoorOpen, LockKeyhole, List, PlusCircle, Settings, ScrollText, ShieldAlert } from 'lucide-react'
import { useKavachStore } from '../store/useKavachStore'
import { useInactivityWatcher } from '../hooks/useInactivityWatcher'
import { useUpdateCheck } from '../hooks/useUpdateCheck'
import { UpdateBanner } from './UpdateBanner'
import { Button } from './ui/Button'
import { clsx } from 'clsx'

const navItems = [
  { to: '/dashboard', icon: List, label: 'Vault' },
  { to: '/add', icon: PlusCircle, label: 'Add' },
  { to: '/audit', icon: ScrollText, label: 'Audit' },
  { to: '/health', icon: ShieldAlert, label: 'Health' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  const { lock, doLogout } = useKavachStore()
  useInactivityWatcher()
  const updateVersion = useUpdateCheck()

  return (
    <div className="flex min-h-screen flex-col p-5">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 text-zinc-100 shadow-2xl shadow-black/70">
        <header className="border-b border-zinc-800 border-t-2 border-t-kavach-500 bg-zinc-900">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/Kavach-Logo.png" alt="Kavach" className="h-7 w-7 object-contain" />
              <span className="text-base font-bold tracking-widest text-kavach-500 uppercase">
                Kavach
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <div className="group relative">
                <Button variant="ghost" size="sm" onClick={lock}>
                  <LockKeyhole className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute right-0 top-full mt-2 hidden rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg group-hover:block whitespace-nowrap">
                  Lock vault
                </div>
              </div>
              <div className="group relative">
                <Button variant="ghost" size="sm" onClick={doLogout}>
                  <DoorOpen className="h-4 w-4" />
                </Button>
                <div className="pointer-events-none absolute right-0 top-full mt-2 hidden rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200 shadow-lg group-hover:block whitespace-nowrap">
                  Sign out
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="border-b border-zinc-800 bg-zinc-900">
          <div className="flex gap-1 px-4">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'border-kavach-500 text-kavach-400'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {updateVersion && <UpdateBanner version={updateVersion} />}

        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
