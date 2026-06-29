import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computeTicketMetrics } from './tickets'

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

// Sunday so getDay() === 0 → week boundaries are clean multiples of 7 days
const NOW = new Date('2025-01-05T00:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    statusCategory: 'To Do',
    jiraUpdatedAt: new Date(NOW.getTime() - DAY_MS),
    resolvedAt: null,
    storyPoints: null,
    ...overrides,
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

describe('computeTicketMetrics — staleness', () => {
  it('does not count a ticket updated at exactly the 7-day threshold as stale', async () => {
    const staleThreshold = new Date(NOW.getTime() - 7 * DAY_MS)
    mockWhere
      .mockResolvedValueOnce([makeTicket({ statusCategory: 'To Do', jiraUpdatedAt: staleThreshold })])
      .mockResolvedValueOnce([])
    const result = await computeTicketMetrics('proj-1')
    expect(result.staleTickets).toBe(0)
  })

  it('counts a ticket updated 1ms before the 7-day threshold as stale', async () => {
    const justBefore = new Date(NOW.getTime() - 7 * DAY_MS - 1)
    mockWhere
      .mockResolvedValueOnce([makeTicket({ statusCategory: 'In Progress', jiraUpdatedAt: justBefore })])
      .mockResolvedValueOnce([])
    const result = await computeTicketMetrics('proj-1')
    expect(result.staleTickets).toBe(1)
  })
})

describe('computeTicketMetrics — cycle time', () => {
  it('excludes a ticket where doneAt is before inProgressAt from cycle time', async () => {
    const ticket = makeTicket({ id: 't1', statusCategory: 'Done' })
    // inProgressAt is 1 day ago, doneAt is 2 days ago — inverted
    const histories = [
      { ticketId: 't1', toStatusCategory: 'In Progress', changedAt: new Date(NOW.getTime() - DAY_MS) },
      { ticketId: 't1', toStatusCategory: 'Done', changedAt: new Date(NOW.getTime() - 2 * DAY_MS) },
    ]
    mockWhere.mockResolvedValueOnce([ticket]).mockResolvedValueOnce(histories)
    const result = await computeTicketMetrics('proj-1')
    expect(result.cycleTimeHours.median).toBe(0)
  })

  it('includes a ticket with valid doneAt > inProgressAt in cycle time', async () => {
    const ticket = makeTicket({ id: 't1', statusCategory: 'Done' })
    const inProgressAt = new Date(NOW.getTime() - 2 * DAY_MS)
    const doneAt = new Date(NOW.getTime() - DAY_MS)
    const histories = [
      { ticketId: 't1', toStatusCategory: 'In Progress', changedAt: inProgressAt },
      { ticketId: 't1', toStatusCategory: 'Done', changedAt: doneAt },
    ]
    mockWhere.mockResolvedValueOnce([ticket]).mockResolvedValueOnce(histories)
    const result = await computeTicketMetrics('proj-1')
    expect(result.cycleTimeHours.median).toBe(24)
  })
})

// Compute week start dates the same way the source code does (locale-aware, timezone-agnostic)
function computeWeekStart(base: Date, weeksBack: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() - weeksBack * 7 - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

describe('computeTicketMetrics — throughput week binning', () => {
  it('bins a ticket resolved at the exact weekStart into that week', async () => {
    const weekStart = computeWeekStart(NOW, 1)
    const ticket = makeTicket({ id: 't1', statusCategory: 'Done', resolvedAt: weekStart })
    mockWhere.mockResolvedValueOnce([ticket]).mockResolvedValueOnce([])
    const result = await computeTicketMetrics('proj-1')
    const week = result.throughputByWeek.find((w) => w.weekStart === weekStart.toISOString())
    expect(week?.completed).toBe(1)
  })

  it('does not count a ticket resolved 1ms before the 12-week window', async () => {
    const twelveWeeksAgo = computeWeekStart(NOW, 11)
    const ticket = makeTicket({
      id: 't1',
      statusCategory: 'Done',
      resolvedAt: new Date(twelveWeeksAgo.getTime() - 1),
    })
    mockWhere.mockResolvedValueOnce([ticket]).mockResolvedValueOnce([])
    const result = await computeTicketMetrics('proj-1')
    const total = result.throughputByWeek.reduce((sum, w) => sum + w.completed, 0)
    expect(total).toBe(0)
  })
})
