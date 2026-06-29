import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  statusBadgeVariant,
  priorityBadgeVariant,
  prStateBadgeVariant,
  sprintStateBadgeVariant,
  roleBadgeVariant,
  nameInitials,
  relativeDate,
} from './formatters'

describe('statusBadgeVariant', () => {
  it('returns default for done', () => {
    expect(statusBadgeVariant('done')).toBe('default')
  })

  it('is case-insensitive for done', () => {
    expect(statusBadgeVariant('Done')).toBe('default')
  })

  it('returns secondary for in progress', () => {
    expect(statusBadgeVariant('in progress')).toBe('secondary')
  })

  it('is case-insensitive for in progress', () => {
    expect(statusBadgeVariant('In Progress')).toBe('secondary')
  })

  it('returns outline for any other status', () => {
    expect(statusBadgeVariant('To Do')).toBe('outline')
  })
})

describe('priorityBadgeVariant', () => {
  it('returns outline for null priority', () => {
    expect(priorityBadgeVariant(null)).toBe('outline')
  })

  it('returns destructive for highest', () => {
    expect(priorityBadgeVariant('highest')).toBe('destructive')
  })

  it('returns destructive for high', () => {
    expect(priorityBadgeVariant('high')).toBe('destructive')
  })

  it('is case-insensitive for high', () => {
    expect(priorityBadgeVariant('High')).toBe('destructive')
  })

  it('returns secondary for medium', () => {
    expect(priorityBadgeVariant('medium')).toBe('secondary')
  })

  it('returns outline for low', () => {
    expect(priorityBadgeVariant('low')).toBe('outline')
  })
})

describe('prStateBadgeVariant', () => {
  it('returns default when mergedAt is set', () => {
    expect(prStateBadgeVariant('merged', '2024-01-01T00:00:00.000Z')).toBe('default')
  })

  it('returns secondary for open PRs with no mergedAt', () => {
    expect(prStateBadgeVariant('open', null)).toBe('secondary')
  })

  it('returns outline for closed PRs with no mergedAt', () => {
    expect(prStateBadgeVariant('closed', null)).toBe('outline')
  })
})

describe('sprintStateBadgeVariant', () => {
  it('returns default for active', () => {
    expect(sprintStateBadgeVariant('active')).toBe('default')
  })

  it('returns secondary for closed', () => {
    expect(sprintStateBadgeVariant('closed')).toBe('secondary')
  })

  it('returns outline for any other state', () => {
    expect(sprintStateBadgeVariant('future')).toBe('outline')
  })
})

describe('roleBadgeVariant', () => {
  it('returns default for owner', () => {
    expect(roleBadgeVariant('owner')).toBe('default')
  })

  it('returns secondary for admin', () => {
    expect(roleBadgeVariant('admin')).toBe('secondary')
  })

  it('returns outline for member', () => {
    expect(roleBadgeVariant('member')).toBe('outline')
  })
})

describe('nameInitials', () => {
  it('returns a single uppercase initial for a single-word name', () => {
    expect(nameInitials('Alice')).toBe('A')
  })

  it('returns two initials for a two-word name', () => {
    expect(nameInitials('Alice Smith')).toBe('AS')
  })

  it('caps initials at two characters for names with three or more words', () => {
    expect(nameInitials('Alice Bob Charlie')).toBe('AB')
  })

  it('uppercases lowercase names', () => {
    expect(nameInitials('alice smith')).toBe('AS')
  })
})

describe('relativeDate', () => {
  const NOW = new Date('2025-06-15T12:00:00.000Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "today" when the date is earlier the same day', () => {
    expect(relativeDate('2025-06-15T06:00:00.000Z')).toBe('today')
  })

  it('returns "yesterday" when the date is exactly 24 hours ago', () => {
    expect(relativeDate('2025-06-14T12:00:00.000Z')).toBe('yesterday')
  })

  it('returns Xd ago for 3 days ago', () => {
    expect(relativeDate('2025-06-12T12:00:00.000Z')).toBe('3d ago')
  })

  it('returns 1w ago at exactly 7 days', () => {
    expect(relativeDate('2025-06-08T12:00:00.000Z')).toBe('1w ago')
  })

  it('returns 2w ago at 14 days', () => {
    expect(relativeDate('2025-06-01T12:00:00.000Z')).toBe('2w ago')
  })

  it('returns 1mo ago at 30 days', () => {
    expect(relativeDate('2025-05-16T12:00:00.000Z')).toBe('1mo ago')
  })

  it('returns 1y ago at exactly 365 days', () => {
    expect(relativeDate('2024-06-15T12:00:00.000Z')).toBe('1y ago')
  })
})
