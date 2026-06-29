import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PublicRoute } from './PublicRoute'

const { mockUseSession } = vi.hoisted(() => ({ mockUseSession: vi.fn() }))

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: mockUseSession },
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  Outlet: () => <div data-testid="outlet" />,
}))

beforeEach(() => vi.clearAllMocks())

describe('PublicRoute', () => {
  it('renders a spinner while the session is pending', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    const { container } = render(<PublicRoute />)
    expect(screen.queryByTestId('navigate')).toBeNull()
    expect(screen.queryByTestId('outlet')).toBeNull()
    expect(container.querySelector('div')).not.toBeNull()
  })

  it('renders the outlet when there is no session', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    render(<PublicRoute />)
    expect(screen.getByTestId('outlet')).not.toBeNull()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })

  it('redirects to /dashboard when a session already exists', () => {
    mockUseSession.mockReturnValue({
      data: { session: {}, user: {} },
      isPending: false,
    })
    render(<PublicRoute />)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/dashboard')
  })
})
