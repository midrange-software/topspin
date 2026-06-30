import { handle } from 'hono/aws-lambda'
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda'
import { createApp } from './app'
import { loadSecrets } from './lib/secrets'

const app = createApp()
const originalHandler = handle(app)

let initialized = false

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  if (!initialized) {
    await loadSecrets()
    initialized = true
  }
  return originalHandler(event, context)
}
