import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraProjects, jiraConnections, githubInstallations } from '@topspin/db/schema'
import { auth } from '../../lib/auth'
import { computeTicketMetrics, computeSprintMetrics } from '../../lib/metrics/tickets'
import { computePrMetrics } from '../../lib/metrics/prs'
import { computeHealthScore } from '../../lib/metrics/health'

const metrics = new Hono()

const getProjectWithOrgId = async (projectId: string) => {
  const [row] = await db
    .select({
      projectId: jiraProjects.id,
      connectionOrgId: jiraConnections.organizationId,
    })
    .from(jiraProjects)
    .innerJoin(jiraConnections, eq(jiraProjects.connectionId, jiraConnections.id))
    .where(eq(jiraProjects.id, projectId))
  return row ?? null
}

// GET /api/metrics/projects/:projectId/tickets
metrics.get('/projects/:projectId/tickets', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const project = await getProjectWithOrgId(c.req.param('projectId'))
  if (!project || project.connectionOrgId !== activeOrgId) return c.json({ error: 'Not found' }, 404)

  return c.json(await computeTicketMetrics(c.req.param('projectId')))
})

// GET /api/metrics/projects/:projectId/sprints
metrics.get('/projects/:projectId/sprints', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const project = await getProjectWithOrgId(c.req.param('projectId'))
  if (!project || project.connectionOrgId !== activeOrgId) return c.json({ error: 'Not found' }, 404)

  return c.json(await computeSprintMetrics(c.req.param('projectId')))
})

// GET /api/metrics/projects/:projectId/health
metrics.get('/projects/:projectId/health', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const project = await getProjectWithOrgId(c.req.param('projectId'))
  if (!project || project.connectionOrgId !== activeOrgId) return c.json({ error: 'Not found' }, 404)

  return c.json(await computeHealthScore(activeOrgId, c.req.param('projectId')))
})

// GET /api/metrics/prs
metrics.get('/prs', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  return c.json(await computePrMetrics(activeOrgId))
})

// GET /api/metrics/summary
metrics.get('/summary', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const [prMetrics, projectRows, installation] = await Promise.all([
    computePrMetrics(activeOrgId),
    db
      .select({ id: jiraProjects.id, key: jiraProjects.key, name: jiraProjects.name })
      .from(jiraProjects)
      .innerJoin(jiraConnections, eq(jiraProjects.connectionId, jiraConnections.id))
      .where(eq(jiraConnections.organizationId, activeOrgId)),
    db
      .select({ accountLogin: githubInstallations.accountLogin })
      .from(githubInstallations)
      .where(eq(githubInstallations.organizationId, activeOrgId))
      .then((rows) => rows[0] ?? null),
  ])

  const projectSummaries = await Promise.all(
    projectRows.map(async (p) => {
      const [ticketMetrics, health] = await Promise.all([
        computeTicketMetrics(p.id),
        computeHealthScore(activeOrgId, p.id),
      ])
      return {
        projectId: p.id,
        key: p.key,
        name: p.name,
        healthScore: health.score,
        totalTickets: ticketMetrics.totalTickets,
        openTickets: ticketMetrics.openTickets,
        inProgressTickets: ticketMetrics.inProgressTickets,
        doneTickets: ticketMetrics.doneTickets,
        staleTickets: ticketMetrics.staleTickets,
        cycleTimeHours: ticketMetrics.cycleTimeHours,
      }
    })
  )

  return c.json({
    organizationId: activeOrgId,
    github: {
      connected: !!installation,
      accountLogin: installation?.accountLogin ?? null,
    },
    prs: prMetrics,
    projects: projectSummaries,
  })
})

export { metrics }
