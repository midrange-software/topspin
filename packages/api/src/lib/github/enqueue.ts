import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

export type SyncJob =
  | { type: 'INITIAL_SYNC'; installationId: number }
  | { type: 'PROCESS_EVENT'; eventId: string }
  | { type: 'JIRA_SYNC_CONNECTION'; connectionId: string }
  | { type: 'JIRA_PROCESS_EVENT'; eventId: string }

const client = new SQSClient({ region: process.env.AWS_REGION })

export const enqueueJob = async (job: SyncJob) => {
  await client.send(
    new SendMessageCommand({
      QueueUrl: process.env.BACKGROUND_QUEUE_URL!,
      MessageBody: JSON.stringify(job),
    })
  )
}
