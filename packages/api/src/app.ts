import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { health } from './routes/health'
import { webhooks } from './routes/github/webhooks'
import { setup } from './routes/github/setup'
import { installations } from './routes/github/installations'

export const createApp = () => {
  const app = new Hono()

  app.use('*', requestLogger())
  app.use(
    '*',
    cors({
      origin: process.env.CORS_ORIGIN ?? '*',
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

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  return app
}
