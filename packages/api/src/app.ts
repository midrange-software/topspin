import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { requestLogger } from './middleware/logger'
import { errorHandler, notFoundHandler } from './middleware/error'
import { health } from './routes/health'

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

  app.onError(errorHandler)
  app.notFound(notFoundHandler)

  return app
}
