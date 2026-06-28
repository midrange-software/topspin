import 'dotenv/config'
import type { SQSHandler } from 'aws-lambda'
import type { SyncJob } from './lib/github/enqueue'
import { performInitialSync, processWebhookEvent } from './lib/github/sync'
import { syncJiraConnection, processJiraEvent } from './lib/jira/sync'

export const handler: SQSHandler = async (event) => {
  const failures: Array<{ messageId: string; error: Error }> = []

  for (const record of event.Records) {
    try {
      const job = JSON.parse(record.body) as SyncJob

      if (job.type === 'INITIAL_SYNC') {
        await performInitialSync(job.installationId)
      } else if (job.type === 'PROCESS_EVENT') {
        await processWebhookEvent(job.eventId)
      } else if (job.type === 'JIRA_SYNC_CONNECTION') {
        await syncJiraConnection(job.connectionId)
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
