import type { MiddlewareHandler } from 'hono'

export const requestLogger = (): MiddlewareHandler => async (c, next) => {
  const start = Date.now()
  const { method } = c.req
  const path = c.req.path

  await next()

  const ms = Date.now() - start
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method,
      path,
      status: c.res.status,
      durationMs: ms,
    })
  )
}
