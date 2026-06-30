import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { health } from './routes/health'
import { webhooks } from './routes/github/webhooks'
import { setup } from './routes/github/setup'
import { installations } from './routes/github/installations'
import { oauth as jiraOauth } from './routes/jira/oauth'
import { webhooks as jiraWebhooks } from './routes/jira/webhooks'
import { connections as jiraConnections } from './routes/jira/connections'
import { tickets as jiraTickets } from './routes/jira/tickets'
import { metrics } from './routes/metrics'

export const createApp = () => {
  const app = new Hono()

  app.use('*', requestLogger())
  const corsOrigin = process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN ?? (() => { throw new Error('CORS_ORIGIN is required in production') })()
    : (process.env.CORS_ORIGIN ?? '*')

  app.use(
    '*',
    cors({
      origin: corsOrigin,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    })
  )

  app.route('/health', health)

  app.on(['GET', 'POST'], '/api/auth/**', (c) => auth.handler(c.req.raw))

  app.route('/api/github/webhooks', webhooks)
  app.route('/api/github/setup', setup)
  app.route('/api/github/installations', installations)

  app.route('/api/jira', jiraOauth)
  app.route('/api/jira/webhooks', jiraWebhooks)
  app.route('/api/jira/connections', jiraConnections)
  app.route('/api/jira/tickets', jiraTickets)

  app.route('/api/metrics', metrics)

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  return app
}
