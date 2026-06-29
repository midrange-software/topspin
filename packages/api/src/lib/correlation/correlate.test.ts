import { describe, it, expect } from 'vitest'
import { extractJiraKeys } from './correlate'

describe('extractJiraKeys', () => {
  it('returns empty array for empty string', () => {
    expect(extractJiraKeys('')).toEqual([])
  })

  it('rejects all-lowercase project key', () => {
    expect(extractJiraKeys('fix abc-123 today')).toEqual([])
  })

  it('rejects single-character project key', () => {
    expect(extractJiraKeys('A-123')).toEqual([])
  })

  it('matches a basic Jira key', () => {
    expect(extractJiraKeys('Fix PROJ-42 now')).toEqual(['PROJ-42'])
  })

  it('accepts underscores in the project part', () => {
    expect(extractJiraKeys('FIX_IT-7 is done')).toEqual(['FIX_IT-7'])
  })

  it('accepts digits in the project part', () => {
    expect(extractJiraKeys('ABC1-456 updated')).toEqual(['ABC1-456'])
  })

  it('deduplicates the same key appearing multiple times', () => {
    expect(extractJiraKeys('ABC-123 and ABC-123 again')).toEqual(['ABC-123'])
  })

  it('extracts a key embedded in a URL path', () => {
    expect(extractJiraKeys('https://jira.example.com/browse/PROJ-456')).toEqual(['PROJ-456'])
  })

  it('extracts multiple distinct keys', () => {
    expect(extractJiraKeys('PROJ-1 is blocked by TEAM-2')).toEqual(['PROJ-1', 'TEAM-2'])
  })
})
