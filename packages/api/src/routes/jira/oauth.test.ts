import { describe, it, expect, vi, beforeEach } from 'vitest'
import { oauth } from './oauth'

const {
  mockGetSession,
  mockSelectWhere,
  mockSelectChain,
  mockOnConflictDoUpdate,
  mockReturning,
  mockInsertValues,
  mockExchangeCode,
  mockGetResources,
  mockEnqueueJob,
} = vi.hoisted(() => {
  const mockSelectWhere = vi.fn()
  const chain: Record<string, any> = { from: vi.fn(), where: mockSelectWhere }
  chain.from.mockReturnValue(chain)

  const mockReturning = vi.fn()
  const mockOnConflictDoUpdate = vi.fn()
  const mockInsertValues = vi.fn()

  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
  mockOnConflictDoUpdate.mockReturnValue({ returning: mockReturning })
  mockReturning.mockResolvedValue([{ id: 'conn-1' }])

  return {
    mockGetSession: vi.fn(),
    mockSelectWhere,
    mockSelectChain: chain,
    mockOnConflictDoUpdate,
    mockReturning,
    mockInsertValues,
    mockExchangeCode: vi.fn(),
    mockGetResources: vi.fn(),
    mockEnqueueJob: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../../lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

vi.mock('@topspin/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}))

vi.mock('../../lib/jira/client', () => ({
  exchangeCodeForTokens: mockExchangeCode,
  getAccessibleResources: mockGetResources,
  JiraClient: class {
    post = vi.fn().mockResolvedValue({})
  },
}))

vi.mock('../../lib/github/enqueue', () => ({
  enqueueJob: mockEnqueueJob,
}))

const FAKE_TOKENS = {
  access_token: 'access-tok',
  refresh_token: 'refresh-tok',
  expires_in: 3600,
}

const FAKE_RESOURCE = { id: 'cloud-id', url: 'https://jira.example.com', name: 'Acme' }

function sessionForOrg(orgId: string) {
  return { session: { activeOrganizationId: orgId }, user: { id: 'user-1' } }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockInsertValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
  mockOnConflictDoUpdate.mockReturnValue({ returning: mockReturning })
  mockReturning.mockResolvedValue([{ id: 'conn-1' }])
  mockEnqueueJob.mockResolvedValue(undefined)
  mockExchangeCode.mockResolvedValue(FAKE_TOKENS)
  mockGetResources.mockResolvedValue([FAKE_RESOURCE])
})

describe('GET /callback — Jira OAuth', () => {
  it('returns 401 when there is no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await oauth.request('/callback?code=authcode&state=org-1')
    expect(res.status).toBe(401)
  })

  it('returns 404 when the org in state does not exist', async () => {
    mockGetSession.mockResolvedValue(sessionForOrg('org-1'))
    mockSelectWhere.mockResolvedValue([]) // org not found
    const res = await oauth.request('/callback?code=authcode&state=org-1')
    expect(res.status).toBe(404)
  })

  // MVP Gap #5 — no org membership check on OAuth callbacks (routes/jira/oauth.ts:51)
  // A session for org-a can pass state=org-b and the route does not reject it.
  it.fails(
    'returns 403 when the state param refers to an org the session user does not belong to',
    async () => {
      mockGetSession.mockResolvedValue(sessionForOrg('org-a'))
      // org-b exists in DB — the route finds it and proceeds
      mockSelectWhere.mockResolvedValue([{ id: 'org-b', name: 'Org B' }])
      const res = await oauth.request('/callback?code=authcode&state=org-b')
      // Currently returns 302 (redirect) instead of 403
      expect(res.status).toBe(403)
    }
  )

  // Fix 1 — webhook secret was lost on Jira reconnect (routes/jira/oauth.ts)
  // onConflictDoUpdate.set now includes webhookSecret so reconnects persist the new secret.
  it(
    'persists the new webhookSecret in onConflictDoUpdate.set when reconnecting',
    async () => {
      mockGetSession.mockResolvedValue(sessionForOrg('org-1'))
      mockSelectWhere.mockResolvedValue([{ id: 'org-1', name: 'Org 1' }])
      await oauth.request('/callback?code=authcode&state=org-1')
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({ webhookSecret: expect.any(String) }),
        })
      )
    }
  )
})
