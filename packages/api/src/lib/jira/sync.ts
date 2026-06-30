import { eq, inArray } from 'drizzle-orm'
import { db } from '@topspin/db'
import {
  jiraConnections,
  jiraProjects,
  jiraSprints,
  jiraTickets,
  jiraTicketSprints,
  jiraStatusHistory,
  jiraEvents,
} from '@topspin/db/schema'
import { JiraClient } from './client'

function deriveStatusCategory(statusName: string): string {
  const lower = statusName.toLowerCase()
  if (['done', 'closed', 'resolved', 'complete', 'completed', 'cancelled', 'canceled', 'rejected'].some(s => lower.includes(s))) {
    return 'Done'
  }
  if (['progress', 'review', 'development', 'testing', 'qa', 'blocked', 'active'].some(s => lower.includes(s))) {
    return 'In Progress'
  }
  return 'To Do'
}

type JiraProject = {
  id: string
  key: string
  name: string
  projectTypeKey: string
  style?: string
}

type JiraSprint = {
  id: number
  name: string
  state: string
  goal?: string
  startDate?: string
  endDate?: string
  completeDate?: string
}

type JiraIssue = {
  id: string
  key: string
  fields: {
    summary: string
    description?: unknown
    issuetype: { name: string }
    status: { name: string; statusCategory: { name: string } }
    priority?: { name: string }
    assignee?: { accountId: string; displayName: string }
    reporter?: { accountId: string; displayName: string }
    customfield_10014?: string   // epic link (classic)
    customfield_10016?: number  // story points (classic)
    story_points?: number
    parent?: { key: string }
    labels?: string[]
    created: string
    updated: string
    resolutiondate?: string | null
    sprint?: JiraSprint
    closedSprints?: JiraSprint[]
  }
  changelog?: {
    histories: Array<{
      author: { accountId: string; displayName: string }
      created: string
      items: Array<{
        field: string
        fromString?: string
        toString?: string
      }>
    }>
  }
}

const upsertStatusHistory = async (ticketDbId: string, issue: JiraIssue) => {
  if (!issue.changelog?.histories) return

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field !== 'status') continue

      await db
        .insert(jiraStatusHistory)
        .values({
          id: crypto.randomUUID(),
          ticketId: ticketDbId,
          fromStatus: item.fromString ?? null,
          toStatus: item.toString ?? '',
          fromStatusCategory: null,
          toStatusCategory: deriveStatusCategory(item.toString ?? ''),
          authorAccountId: history.author.accountId,
          authorName: history.author.displayName,
          changedAt: new Date(history.created),
        })
        .onConflictDoNothing({ target: [jiraStatusHistory.ticketId, jiraStatusHistory.changedAt, jiraStatusHistory.toStatus] })
    }
  }
}

const upsertTicket = async (projectDbId: string, issue: JiraIssue) => {
  const f = issue.fields
  const storyPoints = f.customfield_10016 ?? f.story_points ?? null

  const [row] = await db
    .insert(jiraTickets)
    .values({
      id: crypto.randomUUID(),
      projectId: projectDbId,
      ticketId: issue.id,
      key: issue.key,
      summary: f.summary,
      description: f.description ? JSON.stringify(f.description) : null,
      type: f.issuetype.name,
      status: f.status.name,
      statusCategory: f.status.statusCategory.name,
      priority: f.priority?.name ?? null,
      assigneeAccountId: f.assignee?.accountId ?? null,
      assigneeName: f.assignee?.displayName ?? null,
      reporterAccountId: f.reporter?.accountId ?? null,
      reporterName: f.reporter?.displayName ?? null,
      epicKey: f.customfield_10014 ?? null,
      parentKey: f.parent?.key ?? null,
      storyPoints: storyPoints !== null ? Math.round(storyPoints) : null,
      labels: f.labels ?? [],
      jiraCreatedAt: new Date(f.created),
      jiraUpdatedAt: new Date(f.updated),
      resolvedAt: f.resolutiondate ? new Date(f.resolutiondate) : null,
    })
    .onConflictDoUpdate({
      target: jiraTickets.ticketId,
      set: {
        summary: f.summary,
        description: f.description ? JSON.stringify(f.description) : null,
        status: f.status.name,
        statusCategory: f.status.statusCategory.name,
        priority: f.priority?.name ?? null,
        assigneeAccountId: f.assignee?.accountId ?? null,
        assigneeName: f.assignee?.displayName ?? null,
        epicKey: f.customfield_10014 ?? null,
        parentKey: f.parent?.key ?? null,
        storyPoints: storyPoints !== null ? Math.round(storyPoints) : null,
        labels: f.labels ?? [],
        jiraUpdatedAt: new Date(f.updated),
        resolvedAt: f.resolutiondate ? new Date(f.resolutiondate) : null,
        updatedAt: new Date(),
      },
    })
    .returning()

  return row
}

const syncProjectIssues = async (client: JiraClient, project: typeof jiraProjects.$inferSelect) => {
  let startAt = 0
  const maxResults = 100

  while (true) {
    type SearchResult = { issues: JiraIssue[]; total: number; startAt: number; maxResults: number }
    const result = await client.get<SearchResult>(
      `/search?jql=${encodeURIComponent(`project = "${project.key}" ORDER BY updated DESC`)}&expand=changelog&startAt=${startAt}&maxResults=${maxResults}&fields=summary,description,issuetype,status,priority,assignee,reporter,customfield_10014,customfield_10016,story_points,parent,labels,created,updated,resolutiondate,sprint`
    )

    for (const issue of result.issues) {
      const ticketRow = await upsertTicket(project.id, issue)
      if (ticketRow) await upsertStatusHistory(ticketRow.id, issue)
    }

    startAt += result.issues.length
    if (startAt >= result.total || result.issues.length === 0) break
  }
}

const syncProjectSprints = async (client: JiraClient, project: typeof jiraProjects.$inferSelect) => {
  if (!project.boardId) return

  type SprintResult = { values: JiraSprint[]; isLast: boolean }
  let startAt = 0

  while (true) {
    const result = await client.getAgile<SprintResult>(
      `/board/${project.boardId}/sprint?startAt=${startAt}&maxResults=50`
    )

    for (const sprint of result.values) {
      await db
        .insert(jiraSprints)
        .values({
          id: crypto.randomUUID(),
          projectId: project.id,
          sprintId: sprint.id,
          name: sprint.name,
          state: sprint.state,
          goal: sprint.goal ?? null,
          startDate: sprint.startDate ? new Date(sprint.startDate) : null,
          endDate: sprint.endDate ? new Date(sprint.endDate) : null,
          completeDate: sprint.completeDate ? new Date(sprint.completeDate) : null,
        })
        .onConflictDoUpdate({
          target: jiraSprints.sprintId,
          set: {
            name: sprint.name,
            state: sprint.state,
            goal: sprint.goal ?? null,
            startDate: sprint.startDate ? new Date(sprint.startDate) : null,
            endDate: sprint.endDate ? new Date(sprint.endDate) : null,
            completeDate: sprint.completeDate ? new Date(sprint.completeDate) : null,
            updatedAt: new Date(),
          },
        })
    }

    if (result.isLast) break
    startAt += result.values.length
  }
}

const syncBoardId = async (client: JiraClient, project: typeof jiraProjects.$inferSelect): Promise<number | null> => {
  try {
    type BoardResult = { values: Array<{ id: number; name: string }> }
    const result = await client.getAgile<BoardResult>(`/board?projectKeyOrId=${project.key}&maxResults=1`)
    return result.values[0]?.id ?? null
  } catch {
    return null
  }
}

export const syncJiraConnection = async (connectionId: string) => {
  const client = new JiraClient(connectionId)

  // Sync projects
  type ProjectsResult = { values: JiraProject[]; isLast: boolean }
  let startAt = 0

  while (true) {
    const result = await client.get<ProjectsResult>(
      `/project/search?startAt=${startAt}&maxResults=50&expand=description`
    )

    for (const project of result.values) {
      const [projectRow] = await db
        .insert(jiraProjects)
        .values({
          id: crypto.randomUUID(),
          connectionId,
          projectId: project.id,
          key: project.key,
          name: project.name,
          projectType: project.projectTypeKey,
          style: project.style ?? null,
        })
        .onConflictDoUpdate({
          target: [jiraProjects.connectionId, jiraProjects.projectId],
          set: {
            name: project.name,
            projectType: project.projectTypeKey,
            style: project.style ?? null,
            updatedAt: new Date(),
          },
        })
        .returning()

      if (!projectRow) continue

      // Discover board ID for sprint sync
      const boardId = await syncBoardId(client, projectRow)
      if (boardId) {
        await db
          .update(jiraProjects)
          .set({ boardId })
          .where(eq(jiraProjects.id, projectRow.id))
        await syncProjectSprints(client, { ...projectRow, boardId })
      }

      await syncProjectIssues(client, projectRow)

      await db
        .update(jiraProjects)
        .set({ syncedAt: new Date(), updatedAt: new Date() })
        .where(eq(jiraProjects.id, projectRow.id))
    }

    if (result.isLast) break
    startAt += result.values.length
  }

  await linkTicketsToSprints(connectionId)

  await db
    .update(jiraConnections)
    .set({ syncedAt: new Date(), updatedAt: new Date() })
    .where(eq(jiraConnections.id, connectionId))
}

export const processJiraEvent = async (eventId: string) => {
  const [event] = await db
    .select()
    .from(jiraEvents)
    .where(eq(jiraEvents.id, eventId))

  if (!event) throw new Error(`Jira event ${eventId} not found`)

  try {
    const payload = JSON.parse(event.payload) as {
      webhookEvent: string
      issue?: JiraIssue
      sprint?: JiraSprint & { originBoardId?: number }
    }

    if (payload.issue) {
      await handleIssueEvent(payload.issue)
    }

    if (payload.sprint) {
      await handleSprintEvent(payload.sprint)
    }

    await db
      .update(jiraEvents)
      .set({ processedAt: new Date() })
      .where(eq(jiraEvents.id, eventId))
  } catch (err) {
    await db
      .update(jiraEvents)
      .set({ error: (err as Error).message })
      .where(eq(jiraEvents.id, eventId))
    throw err
  }
}

const handleIssueEvent = async (issue: JiraIssue) => {
  const projectKey = issue.key.split('-')[0]

  const [project] = await db
    .select()
    .from(jiraProjects)
    .where(eq(jiraProjects.key, projectKey))

  if (!project) return

  const ticketRow = await upsertTicket(project.id, issue)
  if (ticketRow && issue.changelog) {
    await upsertStatusHistory(ticketRow.id, issue)
  }
}

const handleSprintEvent = async (sprint: JiraSprint & { originBoardId?: number }) => {
  const [existing] = await db
    .select()
    .from(jiraSprints)
    .where(eq(jiraSprints.sprintId, sprint.id))

  if (existing) {
    await db
      .update(jiraSprints)
      .set({
        name: sprint.name,
        state: sprint.state,
        goal: sprint.goal ?? null,
        startDate: sprint.startDate ? new Date(sprint.startDate) : null,
        endDate: sprint.endDate ? new Date(sprint.endDate) : null,
        completeDate: sprint.completeDate ? new Date(sprint.completeDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(jiraSprints.sprintId, sprint.id))
    return
  }

  // Sprint doesn't exist yet (sprint_created event) — insert it
  if (!sprint.originBoardId) return

  const [project] = await db
    .select()
    .from(jiraProjects)
    .where(eq(jiraProjects.boardId, sprint.originBoardId))

  if (!project) return

  await db
    .insert(jiraSprints)
    .values({
      id: crypto.randomUUID(),
      projectId: project.id,
      sprintId: sprint.id,
      name: sprint.name,
      state: sprint.state,
      goal: sprint.goal ?? null,
      startDate: sprint.startDate ? new Date(sprint.startDate) : null,
      endDate: sprint.endDate ? new Date(sprint.endDate) : null,
      completeDate: sprint.completeDate ? new Date(sprint.completeDate) : null,
    })
    .onConflictDoNothing()
}

export const linkTicketsToSprints = async (connectionId: string) => {
  const projects = await db
    .select()
    .from(jiraProjects)
    .where(eq(jiraProjects.connectionId, connectionId))

  const client = new JiraClient(connectionId)

  for (const project of projects) {
    const sprints = await db
      .select()
      .from(jiraSprints)
      .where(eq(jiraSprints.projectId, project.id))

    for (const sprint of sprints) {
      type SprintIssues = { issues: Array<{ id: string }>; total: number }
      let startAt = 0

      while (true) {
        const result = await client.getAgile<SprintIssues>(
          `/sprint/${sprint.sprintId}/issue?startAt=${startAt}&maxResults=100&fields=id`
        )

        const ticketIds = result.issues.map((i) => i.id)
        if (ticketIds.length > 0) {
          const tickets = await db
            .select({ id: jiraTickets.id })
            .from(jiraTickets)
            .where(inArray(jiraTickets.ticketId, ticketIds))

          for (const ticket of tickets) {
            await db
              .insert(jiraTicketSprints)
              .values({ ticketId: ticket.id, sprintId: sprint.id })
              .onConflictDoNothing()
          }
        }

        startAt += result.issues.length
        if (startAt >= result.total || result.issues.length === 0) break
      }
    }
  }
}
