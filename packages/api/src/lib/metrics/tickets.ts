import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraTickets, jiraStatusHistory, jiraSprints, jiraTicketSprints } from '@topspin/db/schema'
import { percentile, msToHours, median } from './utils'

export type TicketMetrics = {
  projectId: string
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  doneTickets: number
  staleTickets: number
  cycleTimeHours: { median: number; p75: number; p95: number }
  throughputByWeek: Array<{ weekStart: string; completed: number; storyPoints: number }>
}

export const computeTicketMetrics = async (projectId: string): Promise<TicketMetrics> => {
  const tickets = await db
    .select()
    .from(jiraTickets)
    .where(eq(jiraTickets.projectId, projectId))

  const totalTickets = tickets.length
  const now = new Date()
  const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  let openTickets = 0
  let inProgressTickets = 0
  let doneTickets = 0
  let staleTickets = 0

  for (const ticket of tickets) {
    const cat = ticket.statusCategory.toLowerCase()
    if (cat === 'done') {
      doneTickets++
    } else if (cat === 'in progress') {
      inProgressTickets++
    } else {
      openTickets++
    }
    if (cat !== 'done' && ticket.jiraUpdatedAt < staleThreshold) {
      staleTickets++
    }
  }

  // Cycle time: first "In Progress" → first "Done" for each ticket
  const ticketIds = tickets.map((t) => t.id)
  const cycleTimes: number[] = []

  if (ticketIds.length > 0) {
    const histories = await db
      .select()
      .from(jiraStatusHistory)
      .where(
        and(
          inArray(jiraStatusHistory.ticketId, ticketIds),
          inArray(jiraStatusHistory.toStatusCategory, ['In Progress', 'Done'])
        )
      )

    const byTicket = new Map<string, { inProgressAt?: Date; doneAt?: Date }>()
    for (const h of histories) {
      const entry = byTicket.get(h.ticketId) ?? {}
      const cat = h.toStatusCategory.toLowerCase()
      if (cat === 'in progress' && (!entry.inProgressAt || h.changedAt < entry.inProgressAt)) {
        entry.inProgressAt = h.changedAt
      }
      if (cat === 'done' && (!entry.doneAt || h.changedAt < entry.doneAt)) {
        entry.doneAt = h.changedAt
      }
      byTicket.set(h.ticketId, entry)
    }

    for (const entry of byTicket.values()) {
      if (entry.inProgressAt && entry.doneAt && entry.doneAt > entry.inProgressAt) {
        cycleTimes.push(entry.doneAt.getTime() - entry.inProgressAt.getTime())
      }
    }
  }

  cycleTimes.sort((a, b) => a - b)

  // Throughput: completed tickets per week for the last 12 weeks
  const weeks: Array<{ weekStart: Date; completed: number; storyPoints: number }> = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    weeks.push({ weekStart, completed: 0, storyPoints: 0 })
  }

  const twelveWeeksAgo = weeks[0].weekStart
  const doneTicketsWithDate = tickets.filter(
    (t) => t.statusCategory.toLowerCase() === 'done' && t.resolvedAt && t.resolvedAt >= twelveWeeksAgo
  )

  for (const ticket of doneTicketsWithDate) {
    if (!ticket.resolvedAt) continue
    for (const week of weeks) {
      const weekEnd = new Date(week.weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      if (ticket.resolvedAt >= week.weekStart && ticket.resolvedAt < weekEnd) {
        week.completed++
        week.storyPoints += ticket.storyPoints ?? 0
        break
      }
    }
  }

  return {
    projectId,
    totalTickets,
    openTickets,
    inProgressTickets,
    doneTickets,
    staleTickets,
    cycleTimeHours: {
      median: msToHours(median(cycleTimes)),
      p75: msToHours(percentile(cycleTimes, 75)),
      p95: msToHours(percentile(cycleTimes, 95)),
    },
    throughputByWeek: weeks.map((w) => ({
      weekStart: w.weekStart.toISOString(),
      completed: w.completed,
      storyPoints: w.storyPoints,
    })),
  }
}

export type SprintMetrics = {
  sprintId: string
  sprintName: string
  state: string
  startDate: string | null
  endDate: string | null
  totalTickets: number
  completedTickets: number
  completedStoryPoints: number
  totalStoryPoints: number
}

export const computeSprintMetrics = async (projectId: string): Promise<SprintMetrics[]> => {
  const sprints = await db
    .select()
    .from(jiraSprints)
    .where(eq(jiraSprints.projectId, projectId))

  const results: SprintMetrics[] = []

  for (const sprint of sprints) {
    const links = await db
      .select({ ticketId: jiraTicketSprints.ticketId })
      .from(jiraTicketSprints)
      .where(eq(jiraTicketSprints.sprintId, sprint.id))

    const ticketIds = links.map((l) => l.ticketId)
    if (ticketIds.length === 0) {
      results.push({
        sprintId: sprint.id,
        sprintName: sprint.name,
        state: sprint.state,
        startDate: sprint.startDate?.toISOString() ?? null,
        endDate: sprint.endDate?.toISOString() ?? null,
        totalTickets: 0,
        completedTickets: 0,
        completedStoryPoints: 0,
        totalStoryPoints: 0,
      })
      continue
    }

    const tickets = await db
      .select()
      .from(jiraTickets)
      .where(inArray(jiraTickets.id, ticketIds))

    const completedTickets = tickets.filter((t) => t.statusCategory.toLowerCase() === 'done').length
    const completedStoryPoints = tickets
      .filter((t) => t.statusCategory.toLowerCase() === 'done')
      .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
    const totalStoryPoints = tickets.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)

    results.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate?.toISOString() ?? null,
      endDate: sprint.endDate?.toISOString() ?? null,
      totalTickets: tickets.length,
      completedTickets,
      completedStoryPoints,
      totalStoryPoints,
    })
  }

  return results
}
