import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { db } from '@topspin/db'
import { pullRequests, pullRequestReviews, repositories, githubInstallations } from '@topspin/db/schema'
import { percentile, msToHours, median } from './utils'

export type PrMetrics = {
  organizationId: string
  totalPrs: number
  openPrs: number
  mergedPrs: number
  closedPrs: number
  draftPrs: number
  cycleTimeHours: { median: number; p75: number; p95: number }
  reviewLagHours: { median: number; p75: number; p95: number }
  mergeRate: number
  throughputByWeek: Array<{ weekStart: string; merged: number }>
}

export const computePrMetrics = async (organizationId: string): Promise<PrMetrics> => {
  const prs = await db
    .select()
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .innerJoin(githubInstallations, eq(repositories.installationId, githubInstallations.id))
    .where(eq(githubInstallations.organizationId, organizationId))

  const prRows = prs.map((r) => r.pull_request)

  const totalPrs = prRows.length
  const openPrs = prRows.filter((p) => p.state === 'open').length
  const mergedPrs = prRows.filter((p) => p.state === 'merged').length
  const closedPrs = prRows.filter((p) => p.state === 'closed').length
  const draftPrs = prRows.filter((p) => p.draft).length

  const closedOrMerged = prRows.filter((p) => p.state === 'closed' || p.state === 'merged')
  const mergeRate = closedOrMerged.length > 0 ? Math.round((mergedPrs / closedOrMerged.length) * 100) : 0

  // PR cycle time: opened → merged
  const cycleTimes = prRows
    .filter((p) => p.mergedAt)
    .map((p) => p.mergedAt!.getTime() - p.githubCreatedAt.getTime())
    .sort((a, b) => a - b)

  // Review lag: opened → first review
  const prIds = prRows.map((p) => p.id)
  const reviewLags: number[] = []

  if (prIds.length > 0) {
    const reviews = await db
      .select({
        pullRequestId: pullRequestReviews.pullRequestId,
        submittedAt: pullRequestReviews.submittedAt,
      })
      .from(pullRequestReviews)
      .where(
        and(
          inArray(pullRequestReviews.pullRequestId, prIds),
          isNotNull(pullRequestReviews.submittedAt)
        )
      )

    const firstReviewByPr = new Map<string, Date>()
    for (const review of reviews) {
      if (!review.submittedAt) continue
      const existing = firstReviewByPr.get(review.pullRequestId)
      if (!existing || review.submittedAt < existing) {
        firstReviewByPr.set(review.pullRequestId, review.submittedAt)
      }
    }

    for (const pr of prRows) {
      const firstReview = firstReviewByPr.get(pr.id)
      if (firstReview) {
        reviewLags.push(firstReview.getTime() - pr.githubCreatedAt.getTime())
      }
    }
    reviewLags.sort((a, b) => a - b)
  }

  // Throughput: merged PRs per week for last 12 weeks
  const now = new Date()
  const weeks: Array<{ weekStart: Date; merged: number }> = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    weeks.push({ weekStart, merged: 0 })
  }

  const twelveWeeksAgo = weeks[0].weekStart
  for (const pr of prRows.filter((p) => p.mergedAt && p.mergedAt >= twelveWeeksAgo)) {
    for (const week of weeks) {
      const weekEnd = new Date(week.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      if (pr.mergedAt! >= week.weekStart && pr.mergedAt! < weekEnd) {
        week.merged++
        break
      }
    }
  }

  return {
    organizationId,
    totalPrs,
    openPrs,
    mergedPrs,
    closedPrs,
    draftPrs,
    cycleTimeHours: {
      median: msToHours(median(cycleTimes)),
      p75: msToHours(percentile(cycleTimes, 75)),
      p95: msToHours(percentile(cycleTimes, 95)),
    },
    reviewLagHours: {
      median: msToHours(median(reviewLags)),
      p75: msToHours(percentile(reviewLags, 75)),
      p95: msToHours(percentile(reviewLags, 95)),
    },
    mergeRate,
    throughputByWeek: weeks.map((w) => ({ weekStart: w.weekStart.toISOString(), merged: w.merged })),
  }
}
