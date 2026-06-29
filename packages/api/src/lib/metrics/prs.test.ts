import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computePrMetrics } from './prs'

const { mockWhere, mockChain } = vi.hoisted(() => {
  const mockWhere = vi.fn()
  const chain: Record<string, any> = { from: vi.fn(), innerJoin: vi.fn(), where: mockWhere }
  chain.from.mockReturnValue(chain)
  chain.innerJoin.mockReturnValue(chain)
  return { mockWhere, mockChain: chain }
})

vi.mock('@topspin/db', () => ({
  db: { select: vi.fn(() => mockChain) },
}))

const NOW = new Date('2025-01-05T00:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

function makePrRow(overrides: Record<string, unknown> = {}) {
  return {
    pull_request: {
      id: 'pr-1',
      state: 'open',
      draft: false,
      mergedAt: null,
      githubCreatedAt: new Date(NOW.getTime() - 48 * HOUR_MS),
      ...overrides,
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.clearAllMocks()
  mockChain.from.mockReturnValue(mockChain)
  mockChain.innerJoin.mockReturnValue(mockChain)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('computePrMetrics — merge rate', () => {
  it('returns 0 (not NaN) when there are no closed or merged PRs', async () => {
    mockWhere.mockResolvedValueOnce([makePrRow(), makePrRow({ id: 'pr-2' })]).mockResolvedValueOnce([])
    const result = await computePrMetrics('org-1')
    expect(result.mergeRate).toBe(0)
    expect(Number.isNaN(result.mergeRate)).toBe(false)
  })

  it('calculates merge rate as a rounded percentage of merged vs closed+merged', async () => {
    const created = new Date(NOW.getTime() - 24 * HOUR_MS)
    const merged = new Date(NOW.getTime() - 12 * HOUR_MS)
    const prs = [
      makePrRow({ id: 'pr-1', state: 'merged', mergedAt: merged, githubCreatedAt: created }),
      makePrRow({ id: 'pr-2', state: 'closed', githubCreatedAt: created }),
    ]
    mockWhere.mockResolvedValueOnce(prs).mockResolvedValueOnce([])
    const result = await computePrMetrics('org-1')
    expect(result.mergeRate).toBe(50)
  })
})

describe('computePrMetrics — review lag', () => {
  it('uses the earliest review for lag, not a later one', async () => {
    const created = new Date(NOW.getTime() - 10 * HOUR_MS)
    const prs = [makePrRow({ id: 'pr-1', githubCreatedAt: created })]
    const reviews = [
      // later review first in array — should not affect result
      { pullRequestId: 'pr-1', submittedAt: new Date(created.getTime() + 8 * HOUR_MS) },
      { pullRequestId: 'pr-1', submittedAt: new Date(created.getTime() + 4 * HOUR_MS) },
    ]
    mockWhere.mockResolvedValueOnce(prs).mockResolvedValueOnce(reviews)
    const result = await computePrMetrics('org-1')
    expect(result.reviewLagHours.median).toBe(4)
  })
})

describe('computePrMetrics — draft PRs', () => {
  it('counts draft PRs in draftPrs without excluding them from totalPrs', async () => {
    const prs = [
      makePrRow({ id: 'pr-1', state: 'open', draft: true }),
      makePrRow({ id: 'pr-2', state: 'open', draft: false }),
      makePrRow({ id: 'pr-3', state: 'merged', mergedAt: NOW }),
    ]
    mockWhere.mockResolvedValueOnce(prs).mockResolvedValueOnce([])
    const result = await computePrMetrics('org-1')
    expect(result.draftPrs).toBe(1)
    expect(result.totalPrs).toBe(3)
  })
})
