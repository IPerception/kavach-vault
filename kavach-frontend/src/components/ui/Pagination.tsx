import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { IconButton } from './IconButton'

interface PaginationProps {
  /** 0-based current page. Callers clamp it; this component holds no state. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Optional noun shown after the range, e.g. "credentials". */
  label?: string
}

export function Pagination({ page, pageSize, total, onPageChange, label }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const first = page * pageSize + 1
  const last = Math.min(total, (page + 1) * pageSize)
  const range = total === 0 ? 'Showing 0 of 0' : `Showing ${first}-${last} of ${total}`
  const atStart = page <= 0
  const atEnd = page >= pageCount - 1

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-xs text-muted">
      <span>{label ? `${range} ${label}` : range}</span>
      <div className="flex items-center gap-1">
        <IconButton label="First page" disabled={atStart} onClick={() => onPageChange(0)}>
          <ChevronsLeft size={16} aria-hidden="true" />
        </IconButton>
        <IconButton label="Previous page" disabled={atStart} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
        </IconButton>
        <span className="px-2 font-mono text-2xs text-soft">Page {page + 1} of {pageCount}</span>
        <IconButton label="Next page" disabled={atEnd} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={16} aria-hidden="true" />
        </IconButton>
        <IconButton label="Last page" disabled={atEnd} onClick={() => onPageChange(pageCount - 1)}>
          <ChevronsRight size={16} aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  )
}
