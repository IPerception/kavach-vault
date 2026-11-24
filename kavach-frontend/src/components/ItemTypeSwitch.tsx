import { Link } from 'react-router-dom'
import { cn } from './ui/cn'

const OPTIONS = [
  { to: '/add', label: 'Password', type: 'password' },
  { to: '/add-note', label: 'Secure note', type: 'note' },
] as const

/** "Password | Secure note" switch on the Add screens. Plain links: each type is its own route. */
export function ItemTypeSwitch({ current }: { current: 'password' | 'note' }) {
  return (
    <div role="group" aria-label="Item type" className="inline-flex rounded-control border border-border bg-raised p-0.5">
      {OPTIONS.map(({ to, label, type }) => {
        const active = type === current
        return (
          <Link
            key={type}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-control px-3 py-1 text-sm font-medium transition-colors',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-accent text-accent-fg' : 'text-soft hover:text-text',
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
