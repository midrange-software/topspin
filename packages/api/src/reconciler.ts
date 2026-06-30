import 'dotenv/config'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections, githubInstallations } from '@topspin/db/schema'
import { loadSecrets } from './lib/secrets'

const client = new SQSClient({ region: process.env.AWS_REGION })

let initialized = false

// Triggered by EventBridge on a schedule. Enqueues a full sync for every
// active Jira connection and every non-suspended GitHub installation so
// missed webhooks are reconciled.
export const handler = async () => {
  if (!initialized) {
    await loadSecrets()
    initialized = true
  }
  const [activeJira, activeGitHub] = await Promise.all([
    db.select({ id: jiraConnections.id }).from(jiraConnections).where(eq(jiraConnections.suspended, false)),
    db.select({ installationId: githubInstallations.installationId }).from(githubInstallations).where(eq(githubInstallations.suspended, false)),
  ])

  await Promise.all([
    ...activeJira.map((conn) =>
      client.send(
        new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL!,
          MessageBody: JSON.stringify({ type: 'JIRA_SYNC_CONNECTION', connectionId: conn.id }),
        })
      )
    ),
    ...activeGitHub.map((inst) =>
      client.send(
        new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL!,
          MessageBody: JSON.stringify({ type: 'INITIAL_SYNC', installationId: inst.installationId }),
        })
      )
    ),
  ])

  console.log(JSON.stringify({ jiraScheduled: activeJira.length, githubScheduled: activeGitHub.length, timestamp: new Date().toISOString() }))
  return { jiraScheduled: activeJira.length, githubScheduled: activeGitHub.length }
}
