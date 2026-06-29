import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from './ErrorBoundary'

const ThrowingChild = () => {
  throw new Error('kaboom')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <span>safe content</span>
      </ErrorBoundary>
    )
    expect(screen.queryByText('safe content')).not.toBeNull()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('shows the error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )
    expect(screen.queryByText('Something went wrong')).not.toBeNull()
    expect(screen.queryByText('kaboom')).not.toBeNull()
  })

  it('calls window.location.reload when the reload button is clicked', async () => {
    const mockReload = vi.fn()
    vi.stubGlobal('location', { reload: mockReload })

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    )
    await user.click(screen.getByRole('button', { name: /reload page/i }))
    expect(mockReload).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
  })
})
