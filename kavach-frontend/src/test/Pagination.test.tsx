import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '../components/ui/Pagination'
import { TooltipProvider } from '../components/ui/Tooltip'

function setup(props: { page: number; pageSize?: number; total: number; label?: string }) {
  const onPageChange = vi.fn()
  render(
    <TooltipProvider>
      <Pagination pageSize={25} onPageChange={onPageChange} {...props} />
    </TooltipProvider>,
  )
  return onPageChange
}

describe('Pagination', () => {
  it('shows the range and page count', () => {
    setup({ page: 1, total: 60 })
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByText('Showing 26-50 of 60')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('clips the last range to the total', () => {
    setup({ page: 2, total: 60 })
    expect(screen.getByText('Showing 51-60 of 60')).toBeInTheDocument()
  })

  it('handles an empty list', () => {
    setup({ page: 0, total: 0 })
    expect(screen.getByText('Showing 0 of 0')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('appends the label', () => {
    setup({ page: 0, total: 3, label: 'entries' })
    expect(screen.getByText('Showing 1-3 of 3 entries')).toBeInTheDocument()
  })

  it('disables the start controls on the first page and the end controls on the last', () => {
    setup({ page: 0, total: 10 })
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled()
  })

  it('calls onPageChange for first, previous, next and last', async () => {
    const onPageChange = setup({ page: 1, total: 100 })
    await userEvent.click(screen.getByRole('button', { name: 'First page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(0)
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(0)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    await userEvent.click(screen.getByRole('button', { name: 'Last page' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
  })
})
