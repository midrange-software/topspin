import { computeTicketMetrics } from './tickets'
import { computePrMetrics, type PrMetrics } from './prs'

export type HealthScore = {
  organizationId: string
  projectId: string
  score: number
  breakdown: {
    cycleTime: { score: number; cycleTimeHours: number }
    staleness: { score: number; staleRatio: number }
    throughput: { score: number; weeklyAvg: number }
    reviewLag: { score: number; reviewLagHours: number }
  }
}

// Score each dimension 0–100, then weight into a composite
export const scoreCycleTime = (hours: number): number => {
  // Under 24h = 100, 24h–72h = 80, 72h–168h = 60, 168h–336h = 40, >336h = 20
  if (hours === 0) return 100
  if (hours <= 24) return 100
  if (hours <= 72) return 80
  if (hours <= 168) return 60
  if (hours <= 336) return 40
  return 20
}

export const scoreStaleness = (staleRatio: number): number => {
  // 0% stale = 100, <5% = 90, <15% = 70, <30% = 50, >=30% = 20
  if (staleRatio <= 0) return 100
  if (staleRatio < 0.05) return 90
  if (staleRatio < 0.15) return 70
  if (staleRatio < 0.30) return 50
  return 20
}

export const scoreThroughput = (weeklyAvg: number): number => {
  // Based on avg tickets completed per week — higher is better, uncapped at 10
  if (weeklyAvg >= 10) return 100
  if (weeklyAvg >= 6) return 80
  if (weeklyAvg >= 3) return 60
  if (weeklyAvg >= 1) return 40
  return 20
}

export const scoreReviewLag = (hours: number): number => {
  if (hours === 0) return 100
  if (hours <= 4) return 100
  if (hours <= 24) return 80
  if (hours <= 72) return 60
  if (hours <= 168) return 40
  return 20
}

export const computeHealthScore = async (
  organizationId: string,
  projectId: string,
  prMetrics?: PrMetrics
): Promise<HealthScore> => {
  const [ticketMetrics, resolvedPrMetrics] = await Promise.all([
    computeTicketMetrics(projectId),
    prMetrics ? Promise.resolve(prMetrics) : computePrMetrics(organizationId),
  ])

  const cycleTimeHours = ticketMetrics.cycleTimeHours.median
  const staleRatio =
    ticketMetrics.totalTickets > 0 ? ticketMetrics.staleTickets / ticketMetrics.totalTickets : 0
  const weeklyAvg =
    ticketMetrics.throughputByWeek.reduce((sum, w) => sum + w.completed, 0) /
    Math.max(1, ticketMetrics.throughputByWeek.length)
  const reviewLagHours = resolvedPrMetrics.reviewLagHours.median

  const cycleTimeScore = scoreCycleTime(cycleTimeHours)
  const staleScore = scoreStaleness(staleRatio)
  const throughputScore = scoreThroughput(weeklyAvg)
  const reviewLagScore = scoreReviewLag(reviewLagHours)

  // Weighted composite: cycle time 35%, staleness 25%, throughput 25%, review lag 15%
  const score = Math.round(
    cycleTimeScore * 0.35 +
    staleScore * 0.25 +
    throughputScore * 0.25 +
    reviewLagScore * 0.15
  )

  return {
    organizationId,
    projectId,
    score,
    breakdown: {
      cycleTime: { score: cycleTimeScore, cycleTimeHours },
      staleness: { score: staleScore, staleRatio: Math.round(staleRatio * 100) / 100 },
      throughput: { score: throughputScore, weeklyAvg: Math.round(weeklyAvg * 10) / 10 },
      reviewLag: { score: reviewLagScore, reviewLagHours },
    },
  }
}
