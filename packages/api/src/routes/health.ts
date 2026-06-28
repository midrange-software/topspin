import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { db } from '@topspin/db'

const health = new Hono()

health.get('/', async (c) => {
  try {
    await db.execute(sql`SELECT 1`)
    return c.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return c.json(
      {
        status: 'error',
        message: 'Database unavailable',
        timestamp: new Date().toISOString(),
      },
      503
    )
  }
})

export { health }
