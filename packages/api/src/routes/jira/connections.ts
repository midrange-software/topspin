import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections, jiraProjects } from '@topspin/db/schema'
import { auth } from '../../lib/auth'

const connections = new Hono()

connections.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const rows = await db
    .select({
      id: jiraConnections.id,
      cloudName: jiraConnections.cloudName,
      cloudUrl: jiraConnections.cloudUrl,
      suspended: jiraConnections.suspended,
      syncedAt: jiraConnections.syncedAt,
      createdAt: jiraConnections.createdAt,
    })
    .from(jiraConnections)
    .where(eq(jiraConnections.organizationId, activeOrgId))

  return c.json(rows)
})

connections.get('/:id/projects', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const [connection] = await db
    .select()
    .from(jiraConnections)
    .where(eq(jiraConnections.id, c.req.param('id')))

  if (!connection || connection.organizationId !== activeOrgId) {
    return c.json({ error: 'Not found' }, 404)
  }

  const projects = await db
    .select()
    .from(jiraProjects)
    .where(eq(jiraProjects.connectionId, connection.id))

  return c.json(projects)
})

connections.delete('/:id', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const [connection] = await db
    .select()
    .from(jiraConnections)
    .where(eq(jiraConnections.id, c.req.param('id')))

  if (!connection || connection.organizationId !== activeOrgId) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db.delete(jiraConnections).where(eq(jiraConnections.id, connection.id))

  return c.json({ ok: true })
})

export { connections }
