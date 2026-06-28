import { Hono } from 'hono'
import { db } from '@topspin/db'
import { githubEvents } from '@topspin/db/schema'
import { getGitHubApp } from '../../lib/github/app'
import { enqueueJob } from '../../lib/github/enqueue'

const webhooks = new Hono()

webhooks.post('/', async (c) => {
  const signature = c.req.header('X-Hub-Signature-256') ?? ''
  const eventName = c.req.header('X-GitHub-Event') ?? ''
  const deliveryId = c.req.header('X-GitHub-Delivery') ?? ''

  if (!signature || !eventName || !deliveryId) {
    return c.json({ error: 'Missing required GitHub headers' }, 400)
  }

  const rawBody = await c.req.text()

  const valid = await getGitHubApp().webhooks.verify(rawBody, signature)
  if (!valid) {
    return c.json({ error: 'Invalid signature' }, 401)
  }

  const payload = JSON.parse(rawBody) as { action?: string; installation?: { id: number } }
  const eventId = crypto.randomUUID()

  await db.insert(githubEvents).values({
    id: eventId,
    installationId: payload.installation?.id ?? null,
    deliveryId,
    event: eventName,
    action: payload.action ?? null,
    payload: rawBody,
  })

  if (payload.installation?.id) {
    await enqueueJob({ type: 'PROCESS_EVENT', eventId })
  }

  return c.json({ ok: true })
})

export { webhooks }
