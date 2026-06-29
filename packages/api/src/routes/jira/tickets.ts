import { Hono } from 'hono'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import {
  jiraTickets,
  jiraStatusHistory,
  jiraProjects,
  jiraConnections,
  pullRequests,
  repositories,
  prJiraLinks,
} from '@topspin/db/schema'
import { auth } from '../../lib/auth'

const tickets = new Hono()

// GET /api/jira/tickets?projectId=...
tickets.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const projectId = c.req.query('projectId')

  const rows = await db
    .select({
      id: jiraTickets.id,
      key: jiraTickets.key,
      summary: jiraTickets.summary,
      type: jiraTickets.type,
      status: jiraTickets.status,
      statusCategory: jiraTickets.statusCategory,
      priority: jiraTickets.priority,
      assigneeName: jiraTickets.assigneeName,
      storyPoints: jiraTickets.storyPoints,
      labels: jiraTickets.labels,
      jiraCreatedAt: jiraTickets.jiraCreatedAt,
      jiraUpdatedAt: jiraTickets.jiraUpdatedAt,
      resolvedAt: jiraTickets.resolvedAt,
      projectId: jiraProjects.id,
      projectKey: jiraProjects.key,
      projectName: jiraProjects.name,
    })
    .from(jiraTickets)
    .innerJoin(jiraProjects, eq(jiraTickets.projectId, jiraProjects.id))
    .innerJoin(jiraConnections, eq(jiraProjects.connectionId, jiraConnections.id))
    .where(
      projectId
        ? and(
            eq(jiraConnections.organizationId, activeOrgId),
            eq(jiraTickets.projectId, projectId)
          )
        : eq(jiraConnections.organizationId, activeOrgId)
    )

  return c.json(rows)
})

// GET /api/jira/tickets/:key
tickets.get('/:key', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const key = c.req.param('key')

  const [ticket] = await db
    .select({
      id: jiraTickets.id,
      key: jiraTickets.key,
      summary: jiraTickets.summary,
      description: jiraTickets.description,
      type: jiraTickets.type,
      status: jiraTickets.status,
      statusCategory: jiraTickets.statusCategory,
      priority: jiraTickets.priority,
      assigneeName: jiraTickets.assigneeName,
      reporterName: jiraTickets.reporterName,
      epicKey: jiraTickets.epicKey,
      parentKey: jiraTickets.parentKey,
      storyPoints: jiraTickets.storyPoints,
      labels: jiraTickets.labels,
      jiraCreatedAt: jiraTickets.jiraCreatedAt,
      jiraUpdatedAt: jiraTickets.jiraUpdatedAt,
      resolvedAt: jiraTickets.resolvedAt,
      projectId: jiraProjects.id,
      projectKey: jiraProjects.key,
      projectName: jiraProjects.name,
    })
    .from(jiraTickets)
    .innerJoin(jiraProjects, eq(jiraTickets.projectId, jiraProjects.id))
    .innerJoin(jiraConnections, eq(jiraProjects.connectionId, jiraConnections.id))
    .where(
      and(
        eq(jiraTickets.key, key),
        eq(jiraConnections.organizationId, activeOrgId)
      )
    )

  if (!ticket) return c.json({ error: 'Not found' }, 404)

  const [statusHistory, linkedPrs] = await Promise.all([
    db
      .select({
        id: jiraStatusHistory.id,
        fromStatus: jiraStatusHistory.fromStatus,
        toStatus: jiraStatusHistory.toStatus,
        fromStatusCategory: jiraStatusHistory.fromStatusCategory,
        toStatusCategory: jiraStatusHistory.toStatusCategory,
        authorName: jiraStatusHistory.authorName,
        changedAt: jiraStatusHistory.changedAt,
      })
      .from(jiraStatusHistory)
      .where(eq(jiraStatusHistory.ticketId, ticket.id))
      .orderBy(asc(jiraStatusHistory.changedAt)),

    db
      .select({
        id: pullRequests.id,
        number: pullRequests.number,
        title: pullRequests.title,
        state: pullRequests.state,
        draft: pullRequests.draft,
        authorLogin: pullRequests.authorLogin,
        headBranch: pullRequests.headBranch,
        repoFullName: repositories.fullName,
        mergedAt: pullRequests.mergedAt,
        githubCreatedAt: pullRequests.githubCreatedAt,
      })
      .from(prJiraLinks)
      .innerJoin(pullRequests, eq(prJiraLinks.prId, pullRequests.id))
      .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
      .where(eq(prJiraLinks.ticketId, ticket.id)),
  ])

  return c.json({ ...ticket, statusHistory, linkedPrs })
})

export { tickets }
