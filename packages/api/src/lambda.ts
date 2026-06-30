import { handle } from 'hono/aws-lambda'
import { createApp } from './app'
import { loadSecrets } from './lib/secrets'

const app = createApp()
const originalHandler = handle(app)

let initialized = false

export const handler = async (...args: Parameters<typeof originalHandler>) => {
  if (!initialized) {
    await loadSecrets()
    initialized = true
  }
  return originalHandler(...args)
}
