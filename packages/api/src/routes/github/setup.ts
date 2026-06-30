import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { githubInstallations, organizations } from '@topspin/db/schema'
import { auth } from '../../lib/auth'
import { enqueueJob } from '../../lib/github/enqueue'
import { getFrontendUrl } from '../../lib/config'

const setup = new Hono()

const querySchema = z.object({
  installation_id: z.coerce.number(),
  setup_action: z.enum(['install', 'update']),
  state: z.string(), // organizationId from our system
})

// GitHub redirects here after a user installs or updates the App.
// The `state` param carries the organization ID set by our frontend when
// it built the GitHub App install URL.
setup.get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) return c.json({ error: 'Unauthorized' }, 401)

    const { installation_id, state: organizationId } = c.req.valid('query')

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))

    if (!org) return c.json({ error: 'Organization not found' }, 404)

    // Get account info from the GitHub App
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const octokit = await (await import('../../lib/github/app')).getGitHubApp().getInstallationOctokit(installation_id) as any
    const { data: installation } = await octokit.rest.apps.getInstallation({
      installation_id,
    })

    await db
      .insert(githubInstallations)
      .values({
        id: crypto.randomUUID(),
        installationId: installation_id,
        organizationId,
        accountLogin: installation.account && 'login' in installation.account
          ? installation.account.login
          : String(installation_id),
        accountType: installation.account?.type ?? 'Organization',
      })
      .onConflictDoUpdate({
        target: githubInstallations.installationId,
        set: { organizationId, updatedAt: new Date() },
      })

    await enqueueJob({ type: 'INITIAL_SYNC', installationId: installation_id })

    const frontendUrl = getFrontendUrl()
    return c.redirect(`${frontendUrl}/onboarding/connect-jira`)
  }
)

export { setup }
