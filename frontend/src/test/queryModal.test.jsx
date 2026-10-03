import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { useQueryModal } from '../hooks/useQueryModal'
import { usePaginationParams } from '../hooks/usePaginationParams'

// These two hooks each call useSearchParams(), so each holds its own snapshot
// of the params. react-router resolves a functional setSearchParams update
// against the render that queued it rather than against the live URL, which
// means two writes in one tick do NOT compose — the second reinstates whatever
// the first removed.
//
// That is not a hypothetical: it kept the "New Approval Request" modal open
// after a successful submit, because closing it (drop `?new`) and returning to
// page one (set `?page=1`) were two separate calls in the same handler.

function Harness({ onReady }) {
  const modal = useQueryModal('new')
  const { page, patchParams } = usePaginationParams(20)
  const location = useLocation()

  onReady({ modal, patchParams })

  return (
    <div>
      <span data-testid="open">{String(modal.isOpen)}</span>
      <span data-testid="page">{page}</span>
      <span data-testid="search">{location.search}</span>
    </div>
  )
}

const setup = (initialEntry) => {
  const api = {}
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Harness onReady={(value) => Object.assign(api, value)} />
    </MemoryRouter>,
  )
  return api
}

describe('useQueryModal', () => {
  it('reads its open state from the query string', () => {
    setup('/requests?new=1')
    expect(screen.getByTestId('open').textContent).toBe('true')
  })

  it('is closed when the parameter is absent', () => {
    setup('/requests')
    expect(screen.getByTestId('open').textContent).toBe('false')
  })

  it('closes on its own', () => {
    const api = setup('/requests?new=1&page=3')
    act(() => api.modal.close())

    expect(screen.getByTestId('open').textContent).toBe('false')
    // Unrelated params survive — closing a modal must not discard the
    // page's pagination or filter state.
    expect(screen.getByTestId('page').textContent).toBe('3')
  })

  it('closes and resets the page in a single navigation', () => {
    // The regression. Two separate writes here left `new=1` in the URL and the
    // modal on screen; one merged patch is what actually closes it.
    const api = setup('/requests?new=1&page=3')

    act(() => api.patchParams({ new: null, page: 1 }))

    expect(screen.getByTestId('open').textContent).toBe('false')
    expect(screen.getByTestId('page').textContent).toBe('1')
    expect(screen.getByTestId('search').textContent).not.toContain('new=')
  })

  it('demonstrates why two writes in one tick cannot be used', () => {
    const api = setup('/requests?new=1&page=3')

    // Exactly the pattern the submit handler used to run.
    act(() => {
      api.modal.close()
      api.patchParams({ page: 1 })
    })

    // Documents the hazard rather than the desired behaviour: the second write
    // resolves against a stale snapshot and puts `new=1` back. If react-router
    // ever makes these compose, this expectation flips and the CAUTION note in
    // useQueryModal.js can go.
    expect(screen.getByTestId('open').textContent).toBe('true')
  })
})
