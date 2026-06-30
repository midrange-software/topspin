import 'dotenv/config'
import { eq } from 'drizzle-orm'
import type { SQSHandler } from 'aws-lambda'
import type { SyncJob } from './lib/github/enqueue'
import { db } from '@topspin/db'
import { githubInstallations, jiraConnections, jiraEvents } from '@topspin/db/schema'
import { performInitialSync, processWebhookEvent } from './lib/github/sync'
import { syncJiraConnection, processJiraEvent } from './lib/jira/sync'
import { correlatePr, correlateOrganization } from './lib/correlation/correlate'
import { loadSecrets } from './lib/secrets'

let initialized = false

export const handler: SQSHandler = async (event) => {
  if (!initialized) {
    await loadSecrets()
    initialized = true
  }
  const failures: Array<{ messageId: string; error: Error }> = []

  for (const record of event.Records) {
    try {
      const job = JSON.parse(record.body) as SyncJob

      if (job.type === 'INITIAL_SYNC') {
        await performInitialSync(job.installationId)
        const [inst] = await db
          .select({ organizationId: githubInstallations.organizationId })
          .from(githubInstallations)
          .where(eq(githubInstallations.installationId, job.installationId))
        if (inst) await correlateOrganization(inst.organizationId)
      } else if (job.type === 'PROCESS_EVENT') {
        const prId = await processWebhookEvent(job.eventId)
        if (prId) await correlatePr(prId)
      } else if (job.type === 'JIRA_SYNC_CONNECTION') {
        await syncJiraConnection(job.connectionId)
        const [conn] = await db
          .select({ organizationId: jiraConnections.organizationId })
          .from(jiraConnections)
          .where(eq(jiraConnections.id, job.connectionId))
        if (conn) await correlateOrganization(conn.organizationId)
      } else if (job.type === 'JIRA_PROCESS_EVENT') {
        await processJiraEvent(job.eventId)
        // Correlate immediately after a Jira event instead of waiting for the reconciler
        const [event] = await db
          .select({ connectionId: jiraEvents.connectionId })
          .from(jiraEvents)
          .where(eq(jiraEvents.id, job.eventId))
        if (event?.connectionId) {
          const [conn] = await db
            .select({ organizationId: jiraConnections.organizationId })
            .from(jiraConnections)
            .where(eq(jiraConnections.id, event.connectionId))
          if (conn) await correlateOrganization(conn.organizationId)
        }
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          messageId: record.messageId,
          error: (error as Error).message,
        })
      )
      failures.push({ messageId: record.messageId, error: error as Error })
    }
  }

  // Return partial batch failures so SQS only retries the failed records
  if (failures.length > 0) {
    return {
      batchItemFailures: failures.map((f) => ({ itemIdentifier: f.messageId })),
    }
  }
}
