import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { githubInstallations, repositories } from '@topspin/db/schema'
import { auth } from '../../lib/auth'

const installations = new Hono()

installations.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const rows = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.organizationId, activeOrgId))

  return c.json(rows)
})

installations.get('/:id/repositories', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const [installation] = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.id, c.req.param('id')))

  if (!installation || installation.organizationId !== activeOrgId) {
    return c.json({ error: 'Not found' }, 404)
  }

  const repos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.installationId, installation.id))

  return c.json(repos)
})

installations.delete('/:id', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) return c.json({ error: 'No active organization' }, 400)

  const [installation] = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.id, c.req.param('id')))

  if (!installation || installation.organizationId !== activeOrgId) {
    return c.json({ error: 'Not found' }, 404)
  }

  await db
    .delete(githubInstallations)
    .where(eq(githubInstallations.id, installation.id))

  return c.json({ ok: true })
})

export { installations }
