import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections, organizations } from '@topspin/db/schema'
import { auth } from '../../lib/auth'
import { exchangeCodeForTokens, getAccessibleResources } from '../../lib/jira/client'
import { enqueueJob } from '../../lib/github/enqueue'
import { getFrontendUrl } from '../../lib/config'

const oauth = new Hono()

const SCOPES = [
  'read:jira-work',
  'read:jira-user',
  'manage:jira-webhook',
  'offline_access',
].join(' ')

// Kick off the OAuth flow — frontend links here with ?state=<orgId>
oauth.get(
  '/connect',
  zValidator('query', z.object({ state: z.string() })),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const { state } = c.req.valid('query')
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: process.env.JIRA_CLIENT_ID!,
      scope: SCOPES,
      redirect_uri: `${process.env.API_URL}/api/jira/callback`,
      state,
      response_type: 'code',
      prompt: 'consent',
    })

    return c.redirect(`https://auth.atlassian.com/authorize?${params}`)
  }
)

// Atlassian redirects here after the user grants access
oauth.get(
  '/callback',
  zValidator('query', z.object({ code: z.string(), state: z.string() })),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const { code, state: organizationId } = c.req.valid('query')

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))

    if (!org) return c.json({ error: 'Organization not found' }, 404)

    const tokens = await exchangeCodeForTokens(code)
    const resources = await getAccessibleResources(tokens.access_token)
    const resource = resources[0]

    if (!resource) return c.json({ error: 'No Jira site accessible' }, 400)

    const webhookSecret = crypto.randomUUID()

    const [connection] = await db
      .insert(jiraConnections)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        cloudId: resource.id,
        cloudUrl: resource.url,
        cloudName: resource.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scopes: SCOPES,
        webhookSecret,
      })
      .onConflictDoUpdate({
        target: [jiraConnections.organizationId, jiraConnections.cloudId],
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          webhookSecret,
          suspended: false,
          updatedAt: new Date(),
        },
      })
      .returning()

    if (connection) {
      await registerJiraWebhook(connection.id, webhookSecret)
      await enqueueJob({ type: 'JIRA_SYNC_CONNECTION', connectionId: connection.id })
    }

    const frontendUrl = getFrontendUrl()
    return c.redirect(`${frontendUrl}/onboarding/sync`)
  }
)

const registerJiraWebhook = async (connectionId: string, secret: string) => {
  try {
    const { JiraClient } = await import('../../lib/jira/client')
    const client = new JiraClient(connectionId)
    await client.post('/webhook', {
      url: `${process.env.API_URL}/api/jira/webhooks?connectionId=${connectionId}&secret=${secret}`,
      webhooks: [
        {
          events: [
            'jira:issue_created',
            'jira:issue_updated',
            'jira:issue_deleted',
            'sprint_created',
            'sprint_updated',
            'sprint_deleted',
            'sprint_started',
            'sprint_closed',
          ],
          jqlFilter: '',
        },
      ],
    })
  } catch (err) {
    // Non-fatal: webhook registration failure does not block the connection
    console.error(JSON.stringify({ error: 'Jira webhook registration failed', detail: (err as Error).message }))
  }
}

export { oauth }
