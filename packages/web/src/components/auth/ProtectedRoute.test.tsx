import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from './ProtectedRoute'

const { mockUseSession } = vi.hoisted(() => ({ mockUseSession: vi.fn() }))

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: mockUseSession },
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => ({ pathname: '/dashboard' }),
}))

beforeEach(() => vi.clearAllMocks())

describe('ProtectedRoute', () => {
  it('renders a spinner while the session is pending', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    const { container } = render(<ProtectedRoute />)
    expect(screen.queryByTestId('navigate')).toBeNull()
    expect(screen.queryByTestId('outlet')).toBeNull()
    expect(container.querySelector('div')).not.toBeNull()
  })

  it('redirects to /signin when there is no session', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    render(<ProtectedRoute />)
    const nav = screen.getByTestId('navigate')
    expect(nav.getAttribute('data-to')).toBe('/signin?next=%2Fdashboard')
  })

  it('renders the outlet when a session exists', () => {
    mockUseSession.mockReturnValue({
      data: { session: { activeOrganizationId: 'org-1' }, user: {} },
      isPending: false,
    })
    render(<ProtectedRoute />)
    expect(screen.getByTestId('outlet')).not.toBeNull()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })
})
