import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeHealthScore } from './health'
import { computeTicketMetrics } from './tickets'
import { computePrMetrics } from './prs'
import type { TicketMetrics } from './tickets'
import type { PrMetrics } from './prs'

vi.mock('./tickets')
vi.mock('./prs')

const mockComputeTicketMetrics = vi.mocked(computeTicketMetrics)
const mockComputePrMetrics = vi.mocked(computePrMetrics)

function makeTicketMetrics(overrides: Partial<TicketMetrics> = {}): TicketMetrics {
  return {
    projectId: 'proj-1',
    totalTickets: 10,
    openTickets: 0,
    inProgressTickets: 0,
    doneTickets: 10,
    staleTickets: 0,
    cycleTimeHours: { median: 0, p75: 0, p95: 0 },
    throughputByWeek: Array.from({ length: 12 }, (_, i) => ({
      weekStart: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed: 10,
      storyPoints: 0,
    })),
    ...overrides,
  }
}

function makePrMetrics(overrides: Partial<PrMetrics> = {}): PrMetrics {
  return {
    organizationId: 'org-1',
    totalPrs: 0,
    openPrs: 0,
    mergedPrs: 0,
    closedPrs: 0,
    draftPrs: 0,
    cycleTimeHours: { median: 0, p75: 0, p95: 0 },
    reviewLagHours: { median: 0, p75: 0, p95: 0 },
    mergeRate: 0,
    throughputByWeek: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('computeHealthScore', () => {
  it('returns 100 for perfect inputs across all dimensions', async () => {
    mockComputeTicketMetrics.mockResolvedValue(makeTicketMetrics())
    mockComputePrMetrics.mockResolvedValue(makePrMetrics())
    const result = await computeHealthScore('org-1', 'proj-1')
    expect(result.score).toBe(100)
  })

  it('returns 20 for worst-case inputs across all dimensions', async () => {
    mockComputeTicketMetrics.mockResolvedValue(
      makeTicketMetrics({
        cycleTimeHours: { median: 400, p75: 400, p95: 400 },
        totalTickets: 10,
        staleTickets: 10,
        throughputByWeek: Array.from({ length: 12 }, (_, i) => ({
          weekStart: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
          completed: 0,
          storyPoints: 0,
        })),
      })
    )
    mockComputePrMetrics.mockResolvedValue(
      makePrMetrics({ reviewLagHours: { median: 200, p75: 200, p95: 200 } })
    )
    const result = await computeHealthScore('org-1', 'proj-1')
    expect(result.score).toBe(20)
  })

  it('defaults stale ratio to 0 when there are no tickets (prevents NaN)', async () => {
    mockComputeTicketMetrics.mockResolvedValue(
      makeTicketMetrics({ totalTickets: 0, staleTickets: 0 })
    )
    mockComputePrMetrics.mockResolvedValue(makePrMetrics())
    const result = await computeHealthScore('org-1', 'proj-1')
    expect(result.breakdown.staleness.staleRatio).toBe(0)
    expect(Number.isNaN(result.breakdown.staleness.staleRatio)).toBe(false)
  })

  it('returns correct breakdown fields', async () => {
    mockComputeTicketMetrics.mockResolvedValue(makeTicketMetrics())
    mockComputePrMetrics.mockResolvedValue(makePrMetrics())
    const result = await computeHealthScore('org-1', 'proj-1')
    expect(result.organizationId).toBe('org-1')
    expect(result.projectId).toBe('proj-1')
    expect(result.breakdown.cycleTime.score).toBe(100)
    expect(result.breakdown.staleness.score).toBe(100)
    expect(result.breakdown.throughput.score).toBe(100)
    expect(result.breakdown.reviewLag.score).toBe(100)
  })
})
