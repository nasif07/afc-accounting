import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Pagination from '../components/common/Pagination'

const setup = (props = {}) => {
  const onPageChange = vi.fn()
  const onPageSizeChange = vi.fn()
  const { container } = render(
    <Pagination
      currentPage={5}
      totalItems={347}
      pageSize={20}
      itemLabel="entries"
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...props}
    />,
  )
  return {
    onPageChange,
    onPageSizeChange,
    summary: () => container.querySelector('p').textContent,
  }
}

describe('Pagination', () => {
  it('renders the range summary with an en-dash', () => {
    const { summary } = setup()
    // page 5 at 20/page => items 81-100, joined by an en-dash
    expect(summary()).toBe('81–100 of 347 entries')
  })

  it('marks the active page with aria-current', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Page 5' }).className).toContain('bg-red-600')
  })

  it('collapses to at most 7 page slots', () => {
    setup()
    const pageButtons = screen.getAllByRole('button', { name: /^Page \d+$/ })
    expect(pageButtons.length).toBeLessThanOrEqual(7)
    expect(pageButtons.map((b) => b.textContent)).toEqual(['1', '4', '5', '6', '18'])
  })

  it('navigates via chevrons', () => {
    const { onPageChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(6)
  })

  it('disables chevrons at the boundaries', () => {
    setup({ currentPage: 1 })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()
  })

  it('jumps to a typed page on Enter and clamps out-of-range input', () => {
    const { onPageChange } = setup()
    const input = screen.getByLabelText(/Go to page/)
    fireEvent.change(input, { target: { value: '12' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPageChange).toHaveBeenCalledWith(12)

    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onPageChange).toHaveBeenLastCalledWith(18) // clamped to totalPages
  })

  it('ignores non-numeric go-to input', () => {
    const { onPageChange } = setup()
    const input = screen.getByLabelText(/Go to page/)
    fireEvent.change(input, { target: { value: 'abc' } })
    expect(input).toHaveValue('')
    fireEvent.blur(input)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('reports the chosen page size', () => {
    const { onPageSizeChange } = setup()
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } })
    expect(onPageSizeChange).toHaveBeenCalledWith(50)
  })

  it('includes an off-menu page size so the select is never blank', () => {
    setup({ pageSize: 37 })
    expect(screen.getByLabelText('Rows per page')).toHaveValue('37')
  })

  it('stays rendered and inert with a single page of results', () => {
    setup({ currentPage: 1, totalItems: 3, pageSize: 20 })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })

  it('handles an empty result set without NaN', () => {
    const { summary } = setup({ currentPage: 1, totalItems: 0 })
    expect(summary()).toBe('0 of 0 entries')
  })
})
