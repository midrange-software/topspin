import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections, jiraEvents } from '@topspin/db/schema'
import { enqueueJob } from '../../lib/github/enqueue'

const webhooks = new Hono()

webhooks.post(
  '/',
  zValidator('query', z.object({ connectionId: z.string(), secret: z.string() })),
  async (c) => {
    const { connectionId, secret } = c.req.valid('query')

    const [connection] = await db
      .select()
      .from(jiraConnections)
      .where(eq(jiraConnections.id, connectionId))

    if (!connection || connection.webhookSecret !== secret) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const rawBody = await c.req.text()
    const payload = JSON.parse(rawBody) as { webhookEvent?: string }
    const eventType = payload.webhookEvent ?? 'unknown'

    const eventId = crypto.randomUUID()

    await db.insert(jiraEvents).values({
      id: eventId,
      connectionId,
      eventType,
      payload: rawBody,
    })

    await enqueueJob({ type: 'JIRA_PROCESS_EVENT', eventId })

    return c.json({ ok: true })
  }
)

export { webhooks }
