import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'

const { mockUseDashboard } = vi.hoisted(() => ({
  mockUseDashboard: vi.fn(),
}))

vi.mock('@/api/dashboardApi', () => ({
  useGetDashboardSummaryQuery: mockUseDashboard,
}))

vi.mock('@/components/dashboard/ThroughputChart', () => ({
  ThroughputChart: () => null,
}))

beforeEach(() => vi.clearAllMocks())

const basePrs = {
  totalPrs: 10,
  openPrs: 3,
  mergedPrs: 7,
  closedPrs: 0,
  draftPrs: 0,
  cycleTimeHours: { median: 24, p75: 48, p95: 72 },
  reviewLagHours: { median: 4, p75: 8, p95: 16 },
  mergeRate: 70,
  throughputByWeek: [],
}

const baseProject = {
  projectId: 'proj-1',
  key: 'PROJ',
  name: 'Test Project',
  healthScore: 85,
  totalTickets: 10,
  openTickets: 3,
  inProgressTickets: 2,
  doneTickets: 5,
  staleTickets: 1,
  cycleTimeHours: { median: 24, p75: 48, p95: 72 },
}

function renderDashboard() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>)
}

describe('Dashboard', () => {
  it('shows a skeleton (no error or data content) while loading', () => {
    mockUseDashboard.mockReturnValue({ isLoading: true, isError: false, data: undefined })
    const { container } = renderDashboard()
    expect(screen.queryByText(/failed to load/i)).toBeNull()
    expect(screen.queryByText('No data yet')).toBeNull()
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('shows an error message when the query fails', () => {
    mockUseDashboard.mockReturnValue({ isLoading: false, isError: true, data: undefined })
    renderDashboard()
    expect(screen.queryByText('Failed to load dashboard data. Please refresh.')).not.toBeNull()
  })

  it('shows the empty state when there are no projects or PRs', () => {
    mockUseDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        organizationId: 'org-1',
        github: { connected: false, accountLogin: null },
        prs: { ...basePrs, totalPrs: 0, openPrs: 0, mergedPrs: 0 },
        projects: [],
      },
    })
    renderDashboard()
    expect(screen.queryByText('No data yet')).not.toBeNull()
    expect(screen.queryByText('Connect integrations')).not.toBeNull()
  })

  it('renders project cards when data is present', () => {
    mockUseDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        organizationId: 'org-1',
        github: { connected: true, accountLogin: 'my-org' },
        prs: basePrs,
        projects: [baseProject],
      },
    })
    renderDashboard()
    expect(screen.queryByText('Test Project')).not.toBeNull()
    expect(screen.queryByText('Open PRs')).not.toBeNull()
  })

  it('each ProjectCard links to the project detail page', () => {
    mockUseDashboard.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        organizationId: 'org-1',
        github: { connected: true, accountLogin: 'my-org' },
        prs: basePrs,
        projects: [baseProject],
      },
    })
    renderDashboard()
    const link = screen.queryByRole('link', { name: /test project/i })
    expect(link).not.toBeNull()
    expect((link as HTMLAnchorElement).getAttribute('href')).toBe('/projects/proj-1')
  })
})
