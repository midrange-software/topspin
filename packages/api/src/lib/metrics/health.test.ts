import { describe, it, expect } from 'vitest'
import { scoreCycleTime, scoreStaleness, scoreThroughput, scoreReviewLag } from './health'

describe('scoreCycleTime', () => {
  it('returns 100 for 0 hours', () => {
    expect(scoreCycleTime(0)).toBe(100)
  })

  it('returns 100 at the 24h boundary', () => {
    expect(scoreCycleTime(24)).toBe(100)
  })

  it('returns 80 just above 24h', () => {
    expect(scoreCycleTime(25)).toBe(80)
  })

  it('returns 80 at the 72h boundary', () => {
    expect(scoreCycleTime(72)).toBe(80)
  })

  it('returns 60 just above 72h', () => {
    expect(scoreCycleTime(73)).toBe(60)
  })

  it('returns 60 at the 168h boundary', () => {
    expect(scoreCycleTime(168)).toBe(60)
  })

  it('returns 40 just above 168h', () => {
    expect(scoreCycleTime(169)).toBe(40)
  })

  it('returns 40 at the 336h boundary', () => {
    expect(scoreCycleTime(336)).toBe(40)
  })

  it('returns 20 above 336h', () => {
    expect(scoreCycleTime(337)).toBe(20)
  })
})

describe('scoreStaleness', () => {
  it('returns 100 for 0 stale ratio', () => {
    expect(scoreStaleness(0)).toBe(100)
  })

  it('returns 90 for a ratio just above 0', () => {
    expect(scoreStaleness(0.01)).toBe(90)
  })

  it('returns 90 just below the 5% boundary', () => {
    expect(scoreStaleness(0.049)).toBe(90)
  })

  it('returns 70 at the 5% boundary', () => {
    expect(scoreStaleness(0.05)).toBe(70)
  })

  it('returns 70 just below the 15% boundary', () => {
    expect(scoreStaleness(0.149)).toBe(70)
  })

  it('returns 50 at the 15% boundary', () => {
    expect(scoreStaleness(0.15)).toBe(50)
  })

  it('returns 50 just below the 30% boundary', () => {
    expect(scoreStaleness(0.299)).toBe(50)
  })

  it('returns 20 at the 30% boundary', () => {
    expect(scoreStaleness(0.3)).toBe(20)
  })

  it('returns 20 above 30%', () => {
    expect(scoreStaleness(0.5)).toBe(20)
  })
})

describe('scoreThroughput', () => {
  it('returns 100 at 10 tickets/week', () => {
    expect(scoreThroughput(10)).toBe(100)
  })

  it('returns 100 above 10 tickets/week', () => {
    expect(scoreThroughput(15)).toBe(100)
  })

  it('returns 80 at 6 tickets/week', () => {
    expect(scoreThroughput(6)).toBe(80)
  })

  it('returns 80 just below 10', () => {
    expect(scoreThroughput(9)).toBe(80)
  })

  it('returns 60 at 3 tickets/week', () => {
    expect(scoreThroughput(3)).toBe(60)
  })

  it('returns 60 just below 6', () => {
    expect(scoreThroughput(5)).toBe(60)
  })

  it('returns 40 at 1 ticket/week', () => {
    expect(scoreThroughput(1)).toBe(40)
  })

  it('returns 40 just below 3', () => {
    expect(scoreThroughput(2)).toBe(40)
  })

  it('returns 20 below 1 ticket/week', () => {
    expect(scoreThroughput(0.9)).toBe(20)
  })

  it('returns 20 for 0 tickets/week', () => {
    expect(scoreThroughput(0)).toBe(20)
  })
})

describe('scoreReviewLag', () => {
  it('returns 100 for 0 hours', () => {
    expect(scoreReviewLag(0)).toBe(100)
  })

  it('returns 100 at the 4h boundary', () => {
    expect(scoreReviewLag(4)).toBe(100)
  })

  it('returns 80 just above 4h', () => {
    expect(scoreReviewLag(5)).toBe(80)
  })

  it('returns 80 at the 24h boundary', () => {
    expect(scoreReviewLag(24)).toBe(80)
  })

  it('returns 60 just above 24h', () => {
    expect(scoreReviewLag(25)).toBe(60)
  })

  it('returns 60 at the 72h boundary', () => {
    expect(scoreReviewLag(72)).toBe(60)
  })

  it('returns 40 just above 72h', () => {
    expect(scoreReviewLag(73)).toBe(40)
  })

  it('returns 40 at the 168h boundary', () => {
    expect(scoreReviewLag(168)).toBe(40)
  })

  it('returns 20 above 168h', () => {
    expect(scoreReviewLag(169)).toBe(20)
  })
})
