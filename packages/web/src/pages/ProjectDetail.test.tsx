import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ProjectDetail } from './ProjectDetail'
import type { HealthScore, TicketMetrics, SprintMetrics } from '@/api/projectsApi'

const { mockUseHealth, mockUseTickets, mockUseSprints, mockUseDashboard, mockUseAllTickets } = vi.hoisted(() => ({
  mockUseHealth: vi.fn(),
  mockUseTickets: vi.fn(),
  mockUseSprints: vi.fn(),
  mockUseDashboard: vi.fn(),
  mockUseAllTickets: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useParams: () => ({ projectId: 'proj-1' }) }
})

vi.mock('@/api/dashboardApi', () => ({
  useGetDashboardSummaryQuery: mockUseDashboard,
}))

vi.mock('@/api/projectsApi', () => ({
  useGetProjectHealthQuery: mockUseHealth,
  useGetProjectTicketMetricsQuery: mockUseTickets,
  useGetProjectSprintMetricsQuery: mockUseSprints,
}))

vi.mock('@/api/ticketsApi', () => ({
  useGetTicketsQuery: mockUseAllTickets,
}))

vi.mock('@/components/dashboard/ThroughputChart', () => ({
  ThroughputChart: () => null,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseDashboard.mockReturnValue({ data: undefined })
  mockUseAllTickets.mockReturnValue({ data: undefined })
})

const mockHealth: HealthScore = {
  organizationId: 'org-1',
  projectId: 'proj-1',
  score: 85,
  breakdown: {
    cycleTime: { score: 85, cycleTimeHours: 24 },
    staleness: { score: 80, staleRatio: 0.1 },
    throughput: { score: 75, weeklyAvg: 5 },
    reviewLag: { score: 90, reviewLagHours: 2 },
  },
}

const mockTickets: TicketMetrics = {
  projectId: 'proj-1',
  totalTickets: 20,
  openTickets: 5,
  inProgressTickets: 3,
  doneTickets: 10,
  staleTickets: 3,
  cycleTimeHours: { median: 24, p75: 48, p95: 72 },
  throughputByWeek: [],
}

// Provided in wrong order (closed before active) to verify component sorts correctly
const mockSprintsUnsorted: SprintMetrics[] = [
  {
    sprintId: 's-1',
    sprintName: 'Sprint 1',
    state: 'closed',
    startDate: '2024-12-23',
    endDate: '2025-01-05',
    totalTickets: 10,
    completedTickets: 9,
    completedStoryPoints: 22,
    totalStoryPoints: 25,
  },
  {
    sprintId: 's-2',
    sprintName: 'Sprint 2',
    state: 'active',
    startDate: '2025-01-06',
    endDate: '2025-01-20',
    totalTickets: 8,
    completedTickets: 3,
    completedStoryPoints: 8,
    totalStoryPoints: 20,
  },
]

function renderLoaded() {
  mockUseHealth.mockReturnValue({ data: mockHealth, isLoading: false, isError: false })
  mockUseTickets.mockReturnValue({ data: mockTickets, isLoading: false, isError: false })
  mockUseSprints.mockReturnValue({ data: mockSprintsUnsorted, isLoading: false, isError: false })
  return render(<MemoryRouter><ProjectDetail /></MemoryRouter>)
}

describe('ProjectDetail', () => {
  it('shows a skeleton while loading', () => {
    mockUseHealth.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    mockUseSprints.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    const { container } = render(<MemoryRouter><ProjectDetail /></MemoryRouter>)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
    expect(screen.queryByText(/failed to load/i)).toBeNull()
  })

  it('shows an error message when a query fails', () => {
    mockUseHealth.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    mockUseTickets.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    mockUseSprints.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    render(<MemoryRouter><ProjectDetail /></MemoryRouter>)
    expect(screen.queryByText('Failed to load project data. Please refresh.')).not.toBeNull()
  })

  it('score breakdown bars use dark:bg- classes (not dark:text-) in dark mode', () => {
    const { container } = renderLoaded()
    const barWithDarkBg = container.querySelector('[class*="dark:bg-emerald"]')
    expect(barWithDarkBg).not.toBeNull()
  })

  it('blocked work tab shows the stale ticket count', async () => {
    const user = userEvent.setup()
    renderLoaded()
    await user.click(screen.getByRole('tab', { name: /blocked work/i }))
    // staleTickets=3, totalTickets=20 → "stale tickets — 15% of 20 total"
    // Use the " —" separator to distinguish the count line from the explainer paragraph
    await waitFor(() => expect(screen.queryByText(/stale tickets —/i)).not.toBeNull())
  })

  it('active sprint appears before closed sprints', async () => {
    const user = userEvent.setup()
    renderLoaded()
    await user.click(screen.getByRole('tab', { name: /sprints/i }))
    await waitFor(() => {
      const rows = screen.getAllByRole('row')
      // rows[0] = header, rows[1] = first data row (should be active Sprint 2)
      expect(rows[1].textContent).toContain('Sprint 2')
      expect(rows[2].textContent).toContain('Sprint 1')
    })
  })
})
