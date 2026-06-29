import { describe, it, expect, vi, beforeEach } from 'vitest'
import { webhooks } from './webhooks'

const { mockSelectWhere, mockSelectChain, mockEnqueueJob } = vi.hoisted(() => {
  const mockSelectWhere = vi.fn()
  const chain: Record<string, any> = { from: vi.fn(), where: mockSelectWhere }
  chain.from.mockReturnValue(chain)
  return {
    mockSelectWhere,
    mockSelectChain: chain,
    mockEnqueueJob: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@topspin/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
  },
}))

vi.mock('../../lib/github/enqueue', () => ({
  enqueueJob: mockEnqueueJob,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockEnqueueJob.mockResolvedValue(undefined)
})

describe('POST / — Jira webhooks', () => {
  it('returns 400 when connectionId and secret query params are missing', async () => {
    const res = await webhooks.request('/', { method: 'POST', body: '{}' })
    expect(res.status).toBe(400)
  })

  it('returns 401 when the secret does not match the stored webhookSecret', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'conn-1', webhookSecret: 'correct-secret' }])
    const res = await webhooks.request('/?connectionId=conn-1&secret=wrong-secret', {
      method: 'POST',
      body: '{}',
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and enqueues a JIRA_PROCESS_EVENT job when the request is valid', async () => {
    mockSelectWhere.mockResolvedValue([{ id: 'conn-1', webhookSecret: 'valid-secret' }])
    const res = await webhooks.request('/?connectionId=conn-1&secret=valid-secret', {
      method: 'POST',
      body: JSON.stringify({ webhookEvent: 'jira:issue_updated' }),
    })
    expect(res.status).toBe(200)
    expect(mockEnqueueJob).toHaveBeenCalledWith({
      type: 'JIRA_PROCESS_EVENT',
      eventId: expect.any(String),
    })
  })
})
