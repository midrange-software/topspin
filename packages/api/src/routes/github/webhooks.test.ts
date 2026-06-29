import { describe, it, expect, vi, beforeEach } from 'vitest'
import { webhooks } from './webhooks'

const { mockVerify, mockEnqueueJob, mockInsertValues } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
  mockEnqueueJob: vi.fn().mockResolvedValue(undefined),
  mockInsertValues: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../lib/github/app', () => ({
  getGitHubApp: () => ({ webhooks: { verify: mockVerify } }),
}))

vi.mock('../../lib/github/enqueue', () => ({
  enqueueJob: mockEnqueueJob,
}))

vi.mock('@topspin/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}))

const VALID_HEADERS = {
  'X-Hub-Signature-256': 'sha256=abc',
  'X-GitHub-Event': 'push',
  'X-GitHub-Delivery': 'delivery-123',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockInsertValues.mockResolvedValue([])
  mockEnqueueJob.mockResolvedValue(undefined)
})

describe('POST / — GitHub webhooks', () => {
  it('returns 400 when required headers are missing', async () => {
    const res = await webhooks.request('/', { method: 'POST', body: '{}' })
    expect(res.status).toBe(400)
  })

  it('returns 401 when the HMAC signature is invalid', async () => {
    mockVerify.mockResolvedValue(false)
    const res = await webhooks.request('/', {
      method: 'POST',
      headers: VALID_HEADERS,
      body: '{}',
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and skips enqueueJob when the payload has no installation.id', async () => {
    mockVerify.mockResolvedValue(true)
    const res = await webhooks.request('/', {
      method: 'POST',
      headers: VALID_HEADERS,
      body: JSON.stringify({ action: 'created' }),
    })
    expect(res.status).toBe(200)
    expect(mockEnqueueJob).not.toHaveBeenCalled()
  })

  it('calls enqueueJob with PROCESS_EVENT when payload has installation.id', async () => {
    mockVerify.mockResolvedValue(true)
    const res = await webhooks.request('/', {
      method: 'POST',
      headers: VALID_HEADERS,
      body: JSON.stringify({ action: 'created', installation: { id: 42 } }),
    })
    expect(res.status).toBe(200)
    expect(mockEnqueueJob).toHaveBeenCalledWith({
      type: 'PROCESS_EVENT',
      eventId: expect.any(String),
    })
  })
})
