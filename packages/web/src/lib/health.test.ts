import { describe, it, expect } from 'vitest'
import { healthColor, formatHours } from './health'

describe('healthColor', () => {
  it('returns emerald at score 100', () => {
    expect(healthColor(100)).toBe('text-emerald-600 dark:text-emerald-400')
  })

  it('returns emerald at the 80 boundary', () => {
    expect(healthColor(80)).toBe('text-emerald-600 dark:text-emerald-400')
  })

  it('returns amber just below 80', () => {
    expect(healthColor(79)).toBe('text-amber-600 dark:text-amber-400')
  })

  it('returns amber at the 60 boundary', () => {
    expect(healthColor(60)).toBe('text-amber-600 dark:text-amber-400')
  })

  it('returns red just below 60', () => {
    expect(healthColor(59)).toBe('text-red-600 dark:text-red-400')
  })

  it('returns red at score 0', () => {
    expect(healthColor(0)).toBe('text-red-600 dark:text-red-400')
  })

  // MVP gap — dark-mode score bar bug (ProjectDetail.tsx:207)
  // .replace('text-', 'bg-') has no /g flag so only the first occurrence is swapped,
  // leaving dark:text-emerald-400 instead of dark:bg-emerald-400.
  it.fails(
    'replace("text-", "bg-") converts all text- prefixes including the dark: variant',
    () => {
      expect(healthColor(85).replace('text-', 'bg-')).toBe('bg-emerald-600 dark:bg-emerald-400')
    }
  )
})

describe('formatHours', () => {
  it('returns — for 0 hours', () => {
    expect(formatHours(0)).toBe('—')
  })

  it('returns <1h for fractional hours below 1', () => {
    expect(formatHours(0.5)).toBe('<1h')
  })

  it('returns 1h for exactly 1 hour', () => {
    expect(formatHours(1)).toBe('1h')
  })

  it('rounds and returns hours for values below 24', () => {
    expect(formatHours(23.9)).toBe('24h')
  })

  it('returns 1d for exactly 24 hours', () => {
    expect(formatHours(24)).toBe('1d')
  })

  it('returns 2d for 48 hours', () => {
    expect(formatHours(48)).toBe('2d')
  })
})
