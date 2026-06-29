import { describe, it, expect, vi, beforeEach } from 'vitest'
import { correlatePr } from './correlate'

const { mockSelectWhere, mockSelectChain, mockDeleteWhere, mockInsertValues } = vi.hoisted(() => {
  const mockSelectWhere = vi.fn()
  const chain: Record<string, any> = { from: vi.fn(), innerJoin: vi.fn(), where: mockSelectWhere }
  chain.from.mockReturnValue(chain)
  chain.innerJoin.mockReturnValue(chain)
  const mockDeleteWhere = vi.fn().mockResolvedValue([])
  const mockInsertValues = vi.fn().mockResolvedValue([])
  return { mockSelectWhere, mockSelectChain: chain, mockDeleteWhere, mockInsertValues }
})

vi.mock('@topspin/db', () => ({
  db: {
    select: vi.fn(() => mockSelectChain),
    delete: vi.fn(() => ({ where: mockDeleteWhere })),
    insert: vi.fn(() => ({ values: mockInsertValues })),
  },
}))

function makePr(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    title: 'fix bug',
    headBranch: 'feature/fix-bug',
    body: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockDeleteWhere.mockResolvedValue([])
  mockInsertValues.mockResolvedValue([])
})

describe('correlatePr — source deduplication', () => {
  it('records both sources when the same key appears in title and branch', async () => {
    const pr = makePr({ title: 'Fix PROJ-1 bug', headBranch: 'feature/PROJ-1-fix' })
    mockSelectWhere
      .mockResolvedValueOnce([pr])
      .mockResolvedValueOnce([{ id: 'ticket-1', key: 'PROJ-1' }])
    await correlatePr('pr-1')
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ matchedKey: 'PROJ-1', sources: ['title', 'branch'] }),
      ])
    )
  })

  it('does not duplicate a source label when the same key appears twice in one field', async () => {
    const pr = makePr({ title: 'Fix PROJ-1 and PROJ-1 again', headBranch: 'no-jira' })
    mockSelectWhere
      .mockResolvedValueOnce([pr])
      .mockResolvedValueOnce([{ id: 'ticket-1', key: 'PROJ-1' }])
    await correlatePr('pr-1')
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ matchedKey: 'PROJ-1', sources: ['title'] }),
      ])
    )
  })
})

describe('correlatePr — null body', () => {
  it('skips the body source when body is null', async () => {
    const pr = makePr({ title: 'PROJ-1', headBranch: 'no-jira', body: null })
    mockSelectWhere
      .mockResolvedValueOnce([pr])
      .mockResolvedValueOnce([{ id: 'ticket-1', key: 'PROJ-1' }])
    await correlatePr('pr-1')
    const inserted = mockInsertValues.mock.calls[0][0]
    expect(inserted[0].sources).toEqual(['title'])
    expect(inserted[0].sources).not.toContain('body')
  })
})

describe('correlatePr — db.delete always called on found PR', () => {
  it('calls db.delete before returning when PR has no Jira keys', async () => {
    const pr = makePr({ title: 'fix typo', headBranch: 'no-jira', body: null })
    mockSelectWhere.mockResolvedValueOnce([pr])
    await correlatePr('pr-1')
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1)
    expect(mockInsertValues).not.toHaveBeenCalled()
  })

  it('does not call db.delete when the PR is not found', async () => {
    mockSelectWhere.mockResolvedValueOnce([])
    await correlatePr('pr-999')
    expect(mockDeleteWhere).not.toHaveBeenCalled()
  })

  it('calls db.delete but not db.insert when keys found but no matching tickets', async () => {
    const pr = makePr({ title: 'Fix PROJ-1', headBranch: 'no-jira', body: null })
    mockSelectWhere
      .mockResolvedValueOnce([pr])
      .mockResolvedValueOnce([]) // no tickets found
    await correlatePr('pr-1')
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1)
    expect(mockInsertValues).not.toHaveBeenCalled()
  })
})
