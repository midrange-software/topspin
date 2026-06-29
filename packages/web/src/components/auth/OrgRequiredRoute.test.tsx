import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrgRequiredRoute } from './OrgRequiredRoute'

const { mockUseSession } = vi.hoisted(() => ({ mockUseSession: vi.fn() }))

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: mockUseSession },
}))

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  Outlet: () => <div data-testid="outlet" />,
}))

beforeEach(() => vi.clearAllMocks())

describe('OrgRequiredRoute', () => {
  it('renders a spinner while the session is pending', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true })
    const { container } = render(<OrgRequiredRoute />)
    expect(screen.queryByTestId('navigate')).toBeNull()
    expect(screen.queryByTestId('outlet')).toBeNull()
    expect(container.querySelector('div')).not.toBeNull()
  })

  it('redirects to /signin when there is no session', () => {
    mockUseSession.mockReturnValue({ data: null, isPending: false })
    render(<OrgRequiredRoute />)
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/signin')
  })

  it('redirects to /onboarding/create-org when session has no active org', () => {
    mockUseSession.mockReturnValue({
      data: { session: { activeOrganizationId: null }, user: {} },
      isPending: false,
    })
    render(<OrgRequiredRoute />)
    expect(screen.getByTestId('navigate').getAttribute('data-to')).toBe('/onboarding/create-org')
  })

  it('renders the outlet when session has an active org', () => {
    mockUseSession.mockReturnValue({
      data: { session: { activeOrganizationId: 'org-1' }, user: {} },
      isPending: false,
    })
    render(<OrgRequiredRoute />)
    expect(screen.getByTestId('outlet')).not.toBeNull()
    expect(screen.queryByTestId('navigate')).toBeNull()
  })
})
