import { describe, it, expect, vi, beforeEach } from 'vitest'
import { connections } from './connections'

const { mockGetSession, mockSelectWhere, mockSelectChain, mockDeleteWhere } = vi.hoisted(() => {
  const mockSelectWhere = vi.fn()
  const chain: Record<string, any> = { from: vi.fn(), where: mockSelectWhere }
  chain.from.mockReturnValue(chain)
  return {
    mockGetSession: vi.fn(),
    mockSelectWhere,
    mockSelectChain: chain,
    mockDeleteWhere: vi.fn().mockResolvedValue([]),
  }
})

vi.mock('../../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

vi.mock('@topspin/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
  },
}))

function sessionForOrg(orgId: string) {
  return { session: { activeOrganizationId: orgId }, user: { id: 'user-1' } }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockDeleteWhere.mockResolvedValue([])
})

describe('GET /:id/projects — IDOR', () => {
  it('returns 404 when the Jira connection belongs to a different org', async () => {
    mockGetSession.mockResolvedValue(sessionForOrg('org-a'))
    mockSelectWhere.mockResolvedValue([{ id: 'conn-1', organizationId: 'org-b' }])
    const res = await connections.request('/conn-1/projects')
    expect(res.status).toBe(404)
  })

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await connections.request('/conn-1/projects')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /:id — IDOR', () => {
  it('returns 404 when the Jira connection belongs to a different org', async () => {
    mockGetSession.mockResolvedValue(sessionForOrg('org-a'))
    mockSelectWhere.mockResolvedValue([{ id: 'conn-1', organizationId: 'org-b' }])
    const res = await connections.request('/conn-1', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await connections.request('/conn-1', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
