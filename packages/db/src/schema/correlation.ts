import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { pullRequests } from './github'
import { jiraTickets } from './jira'

export const prJiraLinks = pgTable(
  'pr_jira_link',
  {
    prId: text('pr_id')
      .notNull()
      .references(() => pullRequests.id, { onDelete: 'cascade' }),
    ticketId: text('ticket_id')
      .notNull()
      .references(() => jiraTickets.id, { onDelete: 'cascade' }),
    matchedKey: text('matched_key').notNull(),
    sources: text('sources').array().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.prId, t.ticketId] }) })
)
