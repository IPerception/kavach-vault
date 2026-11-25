import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Eye, Globe, ShieldOff, Star, X } from 'lucide-react'
import { toggleFavourite } from '../api/credentials'
import type { CredentialSummary } from '../api/types'
import { CredentialSearch } from '../components/CredentialSearch'
import { ImportDialog } from '../components/ImportDialog'
import { OtpModal } from '../components/OtpModal'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { Pagination } from '../components/ui/Pagination'
import { Tooltip } from '../components/ui/Tooltip'
import { cn } from '../components/ui/cn'
import { useClipboard } from '../hooks/useClipboard'
import { useVaultAttention } from '../hooks/useVaultAttention'
import { isStale, passwordAgeDate, strengthBucket, type StrengthBucket } from '../lib/attention'
import { formatRelative } from '../lib/date'
import { hostOf, safeHref } from '../lib/url'

const PAGE_SIZE = 25
const VISIBLE_TAGS = 2

type Filter = 'all' | 'fav' | 'pw' | 'note'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fav', label: 'Favourites' },
  { id: 'pw', label: 'Passwords' },
  { id: 'note', label: 'Notes' },
]

const STRENGTH_LABEL: Record<StrengthBucket, string> = { weak: 'Weak', fair: 'Fair', strong: 'Strong' }
const STRENGTH_TONE = { weak: 'weak', fair: 'fair', strong: 'ok' } as const

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const isNoteItem = (c: CredentialSummary) => c.credentialType === 'NOTE'

function InitialTile({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center bg-tile font-display font-semibold text-tile-fg',
        className,
      )}
    >
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

function CopyUsernameButton({ name, username }: { name: string; username: string }) {
  const { copy, copied } = useClipboard()
  return (
    <IconButton label={`Copy username for ${name}`} className="border-border bg-raised" onClick={() => copy(username)}>
      {copied ? (
        <Check size={14} className="text-ok-text" aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
    </IconButton>
  )
}

const pillClass =
  'inline-flex h-7 items-center gap-[7px] rounded-full border border-border bg-panel py-0 pl-1 pr-2.5 text-xs text-text ' +
  'transition-colors hover:bg-row-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

function FavouritePill({ cred }: { cred: CredentialSummary }) {
  const { copy, copied } = useClipboard()

  const content = (
    <>
      <InitialTile name={cred.purpose} className="h-5 w-5 rounded-full text-[11px]" />
      {cred.purpose}
    </>
  )

  if (isNoteItem(cred)) {
    return (
      <OtpModal credentialId={cred.id} purpose={cred.purpose} credentialType="NOTE">
        <button type="button" aria-label={`Reveal note ${cred.purpose} with authenticator code`} className={pillClass}>
          {content}
          <Eye size={12} className="text-muted" aria-hidden="true" />
        </button>
      </OtpModal>
    )
  }
  return (
    <button
      type="button"
      aria-label={`Copy username for ${cred.purpose}`}
      disabled={!cred.username}
      onClick={() => cred.username && copy(cred.username)}
      className={pillClass}
    >
      {content}
      {copied ? (
        <Check size={12} className="text-ok-text" aria-hidden="true" />
      ) : (
        <Copy size={12} className="text-muted" aria-hidden="true" />
      )}
    </button>
  )
}

interface VaultRowProps {
  cred: CredentialSummary
  strength: StrengthBucket | undefined
  expiryDays: number
  onToggleFavourite: (id: number) => void
}

function VaultRow({ cred, strength, expiryDays, onToggleFavourite }: VaultRowProps) {
  const isNote = isNoteItem(cred)
  const fav = Boolean(cred.favourite)
  const editPath = isNote ? `/edit-note/${cred.id}` : `/edit/${cred.id}`
  const host = isNote ? undefined : hostOf(cred.url)
  const href = isNote ? undefined : safeHref(cred.url)
  const tags = cred.tags ?? []
  const hiddenTags = tags.slice(VISIBLE_TAGS)

  // A password's age is when the password changed; a note has no password, so it shows
  // when it was last edited and never reads as stale.
  const dateIso = isNote ? cred.updatedAt : passwordAgeDate(cred)
  const stale = !isNote && isStale(dateIso, expiryDays)

  return (
    <li className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-border px-4 py-2.5 transition-colors hover:bg-row-hover">
      <IconButton
        label={fav ? `Remove ${cred.purpose} from favourites` : `Add ${cred.purpose} to favourites`}
        aria-pressed={fav}
        className={cn('-ml-1.5 h-[26px] w-[26px]', fav ? 'text-accent-text' : 'text-muted')}
        onClick={() => onToggleFavourite(cred.id)}
      >
        <Star size={14} className={fav ? 'fill-current' : undefined} aria-hidden="true" />
      </IconButton>

      <InitialTile name={cred.purpose} className="h-[34px] w-[34px] rounded-panel text-[15px]" />

      <div className="flex min-w-0 flex-[1_1_180px] flex-col">
        <span className="flex items-center gap-2 text-base font-medium">
          <Link
            to={editPath}
            className="min-w-0 truncate rounded-sm text-text hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cred.purpose}
          </Link>
          {isNote && (
            <span className="rounded-[3px] border border-border px-1.5 font-mono text-[10px] font-normal text-muted">
              NOTE
            </span>
          )}
        </span>
        <span className="truncate text-xs text-muted">{isNote ? 'Secure note' : cred.username}</span>
      </div>

      <div className="flex flex-[0_1_auto] flex-wrap gap-1.5">
        {host &&
          (href ? (
            <Chip as="a" href={href} target="_blank" rel="noopener noreferrer">
              <Globe size={11} aria-hidden="true" />
              {host}
            </Chip>
          ) : (
            <Chip>
              <Globe size={11} aria-hidden="true" />
              {host}
            </Chip>
          ))}
        {!isNote && strength && <Chip tone={STRENGTH_TONE[strength]}>{STRENGTH_LABEL[strength]}</Chip>}
        {tags.slice(0, VISIBLE_TAGS).map((tag) => (
          <Chip key={tag}>#{tag}</Chip>
        ))}
        {hiddenTags.length > 0 && (
          <Tooltip label={hiddenTags.map((t) => `#${t}`).join(', ')}>
            <Chip tabIndex={0}>
              +{hiddenTags.length}
              <span className="sr-only"> more tags: {hiddenTags.map((t) => `#${t}`).join(', ')}</span>
            </Chip>
          </Tooltip>
        )}
      </div>

      <time dateTime={dateIso} className={cn('w-16 text-right text-xs', stale ? 'text-fair-text' : 'text-muted')}>
        {formatRelative(dateIso)}
      </time>

      <div className="flex gap-1.5">
        {!isNote && cred.username && <CopyUsernameButton name={cred.purpose} username={cred.username} />}
        <OtpModal credentialId={cred.id} purpose={cred.purpose} credentialType={cred.credentialType}>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Reveal ${cred.purpose} with authenticator code`}
            className="h-[30px] gap-1.5 border-accent-line px-2.5 text-xs font-semibold text-accent-text"
          >
            <Eye size={14} aria-hidden="true" />
            Reveal
          </Button>
        </OtpModal>
      </div>
    </li>
  )
}

export function Dashboard() {
  const [search, setSearch] = useState('')
  // The tag filter lives in the URL (/dashboard?tag=x) so the sidebar tag links work.
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')
  const setActiveTag = (tag: string | null) => setSearchParams(tag === null ? {} : { tag })
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)
  const [importOpen, setImportOpen] = useState(false)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)

  // The tag can also change from outside (sidebar links): start that list on page 1.
  const [seenTag, setSeenTag] = useState(activeTag)
  if (seenTag !== activeTag) {
    setSeenTag(activeTag)
    setPage(0)
  }

  useEffect(() => {
    function isTyping() {
      const el = document.activeElement as HTMLElement | null
      if (!el) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setSearch('')
        setPage(0)
        searchRef.current?.blur()
        return
      }
      if (e.key === 'n' && !isTyping()) {
        e.preventDefault()
        navigate('/add')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  // Health is optional: while it loads or if it fails, healthById is undefined and the rows
  // simply have no strength chip. The same summary feeds the sidebar Health count.
  const { credentials, isLoading, healthById, summary, expiryDays } = useVaultAttention()

  const favouriteMutation = useMutation({
    mutationFn: toggleFavourite,
    // exact: starring changes no password, so it must not trigger a health decrypt pass.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'], exact: true }),
  })

  // A leading # narrows nothing by itself: "#work" and "work" both match the tag.
  const q = search.trim().toLowerCase().replace(/^#/, '')
  const matchesFilter = (c: CredentialSummary) =>
    filter === 'all' || (filter === 'fav' && c.favourite) || (filter === 'pw' && !isNoteItem(c)) || (filter === 'note' && isNoteItem(c))
  const filtered = credentials
    .filter((c) => {
      const matchesSearch =
        c.purpose.toLowerCase().includes(q) ||
        (c.username ?? '').toLowerCase().includes(q) ||
        (c.url ?? '').toLowerCase().includes(q) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
      const matchesTag = activeTag === null || (c.tags ?? []).includes(activeTag)
      return matchesSearch && matchesTag && matchesFilter(c)
    })
    .sort((a, b) => {
      if (a.favourite === b.favourite) return a.purpose.localeCompare(b.purpose)
      return (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0)
    })

  // Clamp rather than trust the stored page: a filter that shrinks the list must not strand us.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  const username = localStorage.getItem('kavach_username') ?? 'there'
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  const favourites = credentials.filter((c) => c.favourite).sort((a, b) => a.purpose.localeCompare(b.purpose))
  const filterCounts: Record<Filter, number> = {
    all: credentials.length,
    fav: favourites.length,
    pw: credentials.filter((c) => !isNoteItem(c)).length,
    note: credentials.filter(isNoteItem).length,
  }

  const { weak, stale, attention } = summary.counts
  const attentionParts = [
    weak > 0 ? `${weak} weak` : null,
    stale > 0 ? `${stale} unchanged for ${expiryDays}+ days` : null,
  ].filter((p): p is string => p !== null)

  if (isLoading) {
    return <p className="text-sm text-soft">Loading...</p>
  }

  const stat = 'flex items-baseline gap-2 rounded-lg border px-3.5 py-2.5'

  return (
    <div className="flex grow flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex-[1_1_220px]">
          <h1 className="text-xl font-semibold tracking-tight text-text">
            {getGreeting()}, {username}
          </h1>
          <p className="text-xs text-muted">{today}</p>
        </div>
        <CredentialSearch ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(0) }} />
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
          Import CSV
        </Button>
        <Button size="sm" kbd="N" aria-label="New item" aria-keyshortcuts="N" onClick={() => navigate('/add')}>
          New item
        </Button>
      </div>

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <div className="flex flex-wrap gap-2.5">
        <div className={cn(stat, 'flex-[1_1_150px] border-border bg-panel')}>
          <span className="text-lg font-semibold text-text">{credentials.length}</span>
          <span className="text-muted">items</span>
        </div>
        <div className={cn(stat, 'flex-[1_1_150px] border-border bg-panel')}>
          <span className="text-lg font-semibold text-text">{favourites.length}</span>
          <span className="text-muted">favourites</span>
        </div>
        <Link
          to="/health"
          className={cn(
            stat,
            'flex-[2_1_280px] no-underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            attention > 0 ? 'border-warn-border bg-warn-bg text-warn-text' : 'border-border bg-panel text-muted',
          )}
        >
          <span className={cn('text-lg font-semibold', attention === 0 && 'text-text')}>{attention}</span>
          <span>need attention{attentionParts.length > 0 && `: ${attentionParts.join(', ')}`}</span>
        </Link>
      </div>

      {favourites.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-2xs uppercase tracking-[0.08em] text-muted">Favourites</span>
          {favourites.map((c) => (
            <FavouritePill key={c.id} cred={c} />
          ))}
        </div>
      )}

      <div className="flex grow flex-col overflow-hidden rounded-panel border border-border bg-panel shadow-surface">
        <div role="group" aria-label="Filter items" className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => { setFilter(f.id); setPage(0) }}
              className={cn(
                'h-[26px] rounded-full border px-2.5 text-xs transition-colors',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                filter === f.id
                  ? 'border-accent-line bg-accent/15 text-text'
                  : 'border-border bg-transparent text-soft hover:bg-row-hover',
              )}
            >
              {f.label} <span className="font-mono opacity-80">{filterCounts[f.id]}</span>
            </button>
          ))}
          {activeTag !== null && (
            <button
              type="button"
              aria-label={`Clear tag filter #${activeTag}`}
              onClick={() => { setActiveTag(null); setPage(0) }}
              className="ml-1 inline-flex h-[26px] items-center gap-1.5 rounded-full border border-accent-line bg-accent/15 px-2.5 font-mono text-xs text-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              #{activeTag}
              <X size={12} aria-hidden="true" />
            </button>
          )}
        </div>

        {credentials.length === 0 ? (
          <div className="flex grow flex-col items-center justify-center gap-1 px-3 py-16 text-center">
            <ShieldOff className="mb-2 h-7 w-7 text-muted" aria-hidden="true" />
            <p className="text-base font-semibold text-text">Your vault is empty</p>
            <p className="text-sm text-muted">Add your first item to get started.</p>
            <Button className="mt-4" onClick={() => navigate('/add')}>
              Add your first item
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="grow px-3 py-7 text-center text-muted">
            {search.trim() ? `No items match "${search.trim()}".` : 'No items match these filters.'}
          </p>
        ) : (
          <ul className="grow">
            {paginated.map((cred) => {
              const health = healthById?.get(cred.id)
              return (
                <VaultRow
                  key={cred.id}
                  cred={cred}
                  strength={health ? strengthBucket(health.strengthScore) : undefined}
                  expiryDays={expiryDays}
                  onToggleFavourite={(id) => favouriteMutation.mutate(id)}
                />
              )
            })}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="-mt-px border-t border-border px-3 py-2">
            {/* -mt-px: when the list fills the panel, the last row's border and this one
                overlap into a single line instead of a doubled 2 px one. */}
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
