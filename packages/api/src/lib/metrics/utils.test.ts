import { describe, it, expect } from 'vitest'
import { percentile, msToHours, median } from './utils'

describe('percentile', () => {
  it('returns 0 for an empty array', () => {
    expect(percentile([], 50)).toBe(0)
  })

  it('clamps p=0 to the first element', () => {
    expect(percentile([10, 20, 30], 0)).toBe(10)
  })

  it('picks the lower middle value for even-length arrays at p=50', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20)
  })

  it('returns the only element for a single-element array', () => {
    expect(percentile([42], 100)).toBe(42)
  })

  it('returns the last element at p=100', () => {
    expect(percentile([5, 10, 15], 100)).toBe(15)
  })

  it('returns the correct p75 value', () => {
    expect(percentile([10, 20, 30, 40], 75)).toBe(30)
  })
})

describe('msToHours', () => {
  it('returns 0 for 0ms', () => {
    expect(msToHours(0)).toBe(0)
  })

  it('converts exactly 1 hour', () => {
    expect(msToHours(3_600_000)).toBe(1)
  })

  it('rounds down for fractional hours below 0.5', () => {
    expect(msToHours(3_600_000 * 1.4)).toBe(1)
  })

  it('rounds up for fractional hours at or above 0.5', () => {
    expect(msToHours(3_600_000 * 1.6)).toBe(2)
  })

  it('converts 24 hours correctly', () => {
    expect(msToHours(3_600_000 * 24)).toBe(24)
  })
})

describe('median', () => {
  it('returns 0 for an empty array', () => {
    expect(median([])).toBe(0)
  })

  it('returns the only element for a single-element array', () => {
    expect(median([5])).toBe(5)
  })

  it('returns the middle value for an odd-length array', () => {
    expect(median([10, 20, 30])).toBe(20)
  })

  it('picks the lower middle value for an even-length array', () => {
    expect(median([10, 20, 30, 40])).toBe(20)
  })
})
