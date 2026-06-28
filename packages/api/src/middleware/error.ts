import type { ErrorHandler, NotFoundHandler } from 'hono'
import { ZodError } from 'zod'

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      { error: 'Validation error', details: err.flatten().fieldErrors },
      400
    )
  }

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    })
  )

  return c.json({ error: 'Internal server error' }, 500)
}

export const notFoundHandler: NotFoundHandler = (c) => {
  return c.json({ error: `Route ${c.req.method} ${c.req.path} not found` }, 404)
}
