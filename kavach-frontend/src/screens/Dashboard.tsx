import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle, Pencil, Trash2, ShieldCheck, KeyRound, Globe, ShieldOff, SearchX, ChevronLeft, ChevronRight } from 'lucide-react'
import { listCredentials, deleteCredential } from '../api/credentials'
import { CredentialSearch } from '../components/CredentialSearch'
import { OtpModal } from '../components/OtpModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function CredentialAvatar({ purpose }: { purpose: string }) {
  const letter = purpose.trim()[0]?.toUpperCase() ?? '?'
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kavach-500/15 text-sm font-bold text-kavach-500">
      {letter}
    </div>
  )
}

export function Dashboard() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 25
  const qc = useQueryClient()

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCredential,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['credentials'] }),
  })

  const q = search.toLowerCase()
  const filtered = credentials.filter((c) =>
    c.purpose.toLowerCase().includes(q) ||
    (c.username ?? '').toLowerCase().includes(q) ||
    (c.url ?? '').toLowerCase().includes(q),
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const username = localStorage.getItem('kavach_username') ?? 'there'
  const withUrls = credentials.filter((c) => c.url).length

  if (isLoading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            {getGreeting()},
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-kavach-500">{username}</h1>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <KeyRound className="h-3.5 w-3.5 text-kavach-500" />
            <span className="text-sm font-medium text-zinc-100">{credentials.length}</span>
            <span className="text-xs text-zinc-500">credentials</span>
          </div>
          {withUrls > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
              <Globe className="h-3.5 w-3.5 text-kavach-500" />
              <span className="text-sm font-medium text-zinc-100">{withUrls}</span>
              <span className="text-xs text-zinc-500">with URL</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs text-zinc-400">Vault secured</span>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <CredentialSearch value={search} onChange={(v) => { setSearch(v); setPage(0) }} />
        <Link to="/add">
          <Button size="sm">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </Link>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {search ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
                <SearchX className="h-7 w-7 text-zinc-500" />
              </div>
              <p className="text-base font-semibold text-zinc-300">No results found</p>
              <p className="mt-1 text-sm text-zinc-500">
                No credentials match <span className="text-zinc-400">"{search}"</span>. Try a different search.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kavach-500/10">
                <ShieldOff className="h-7 w-7 text-kavach-500" />
              </div>
              <p className="text-base font-semibold text-zinc-300">Your vault is empty</p>
              <p className="mt-1 text-sm text-zinc-500">Add your first credential to get started.</p>
              <Link to="/add" className="mt-5">
                <Button>
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  Add credential
                </Button>
              </Link>
            </>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {paginated.map((cred) => (
          <li key={cred.id}>
            <Card className="flex items-center justify-between border border-kavach-500/25 p-4 transition-colors hover:border-kavach-500/60 hover:bg-kavach-950/40">
              <div className="flex min-w-0 items-center gap-3">
                <CredentialAvatar purpose={cred.purpose} />
                <div className="min-w-0">
                <p className="truncate font-medium text-zinc-100">{cred.purpose}</p>
                {cred.username && (
                  <p className="truncate text-xs text-zinc-400">{cred.username}</p>
                )}
                {cred.url && (
                  <a
                    href={cred.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-kavach-500 hover:text-kavach-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {cred.url}
                  </a>
                )}
                {cred.notes && (
                  <p className="truncate text-xs italic text-zinc-500">{cred.notes}</p>
                )}
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <OtpModal credentialId={cred.id} purpose={cred.purpose}>
                  <Button size="sm" variant="secondary">
                    Reveal
                  </Button>
                </OtpModal>
                <Link to={`/edit/${cred.id}`}>
                  <Button size="sm" variant="ghost" aria-label="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete "${cred.purpose}"?`)) {
                      deleteMutation.mutate(cred.id)
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-400">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
