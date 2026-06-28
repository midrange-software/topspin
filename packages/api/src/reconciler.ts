import 'dotenv/config'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections } from '@topspin/db/schema'

const client = new SQSClient({ region: process.env.AWS_REGION })

// Triggered by EventBridge on a schedule. Enqueues a full sync for every
// active Jira connection so missed webhooks are reconciled.
export const handler = async () => {
  const active = await db
    .select({ id: jiraConnections.id })
    .from(jiraConnections)
    .where(eq(jiraConnections.suspended, false))

  await Promise.all(
    active.map((conn) =>
      client.send(
        new SendMessageCommand({
          QueueUrl: process.env.BACKGROUND_QUEUE_URL!,
          MessageBody: JSON.stringify({ type: 'JIRA_SYNC_CONNECTION', connectionId: conn.id }),
        })
      )
    )
  )

  console.log(JSON.stringify({ scheduled: active.length, timestamp: new Date().toISOString() }))
  return { scheduled: active.length }
}
