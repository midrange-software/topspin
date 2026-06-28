import 'dotenv/config'
import { eq } from 'drizzle-orm'
import type { SQSHandler } from 'aws-lambda'
import type { SyncJob } from './lib/github/enqueue'
import { db } from '@topspin/db'
import { githubInstallations, jiraConnections } from '@topspin/db/schema'
import { performInitialSync, processWebhookEvent } from './lib/github/sync'
import { syncJiraConnection, processJiraEvent } from './lib/jira/sync'
import { correlateOrganization } from './lib/correlation/correlate'

export const handler: SQSHandler = async (event) => {
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
        await processWebhookEvent(job.eventId)
      } else if (job.type === 'JIRA_SYNC_CONNECTION') {
        await syncJiraConnection(job.connectionId)
        const [conn] = await db
          .select({ organizationId: jiraConnections.organizationId })
          .from(jiraConnections)
          .where(eq(jiraConnections.id, job.connectionId))
        if (conn) await correlateOrganization(conn.organizationId)
      } else if (job.type === 'JIRA_PROCESS_EVENT') {
        await processJiraEvent(job.eventId)
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
