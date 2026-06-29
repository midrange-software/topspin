import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installations } from './installations'

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

describe('GET /:id/repositories — IDOR', () => {
  it('returns 404 when the installation belongs to a different org', async () => {
    mockGetSession.mockResolvedValue(sessionForOrg('org-a'))
    mockSelectWhere.mockResolvedValue([{ id: 'install-1', organizationId: 'org-b' }])
    const res = await installations.request('/install-1/repositories')
    expect(res.status).toBe(404)
  })

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await installations.request('/install-1/repositories')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /:id — IDOR', () => {
  it('returns 404 when the installation belongs to a different org', async () => {
    mockGetSession.mockResolvedValue(sessionForOrg('org-a'))
    mockSelectWhere.mockResolvedValue([{ id: 'install-1', organizationId: 'org-b' }])
    const res = await installations.request('/install-1', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })

  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await installations.request('/install-1', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
