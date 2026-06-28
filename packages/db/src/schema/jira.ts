import { boolean, integer, pgTable, primaryKey, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const jiraConnections = pgTable(
  'jira_connection',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    cloudId: text('cloud_id').notNull(),
    cloudUrl: text('cloud_url').notNull(),
    cloudName: text('cloud_name').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token').notNull(),
    accessTokenExpiresAt: timestamp('access_token_expires_at').notNull(),
    scopes: text('scopes').notNull(),
    webhookSecret: text('webhook_secret').notNull(),
    suspended: boolean('suspended').notNull().default(false),
    syncedAt: timestamp('synced_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: unique('jira_connection_org_cloud_unique').on(t.organizationId, t.cloudId) })
)

export const jiraProjects = pgTable(
  'jira_project',
  {
    id: text('id').primaryKey(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => jiraConnections.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    key: text('key').notNull(),
    name: text('name').notNull(),
    projectType: text('project_type'),
    style: text('style'),
    boardId: integer('board_id'),
    syncedAt: timestamp('synced_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: unique('jira_project_connection_project_unique').on(t.connectionId, t.projectId) })
)

export const jiraSprints = pgTable('jira_sprint', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => jiraProjects.id, { onDelete: 'cascade' }),
  sprintId: integer('sprint_id').notNull().unique(),
  name: text('name').notNull(),
  state: text('state').notNull(),
  goal: text('goal'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  completeDate: timestamp('complete_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const jiraTickets = pgTable('jira_ticket', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => jiraProjects.id, { onDelete: 'cascade' }),
  ticketId: text('ticket_id').notNull().unique(),
  key: text('key').notNull().unique(),
  summary: text('summary').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  status: text('status').notNull(),
  statusCategory: text('status_category').notNull(),
  priority: text('priority'),
  assigneeAccountId: text('assignee_account_id'),
  assigneeName: text('assignee_name'),
  reporterAccountId: text('reporter_account_id'),
  reporterName: text('reporter_name'),
  epicKey: text('epic_key'),
  parentKey: text('parent_key'),
  storyPoints: integer('story_points'),
  labels: text('labels').array(),
  jiraCreatedAt: timestamp('jira_created_at').notNull(),
  jiraUpdatedAt: timestamp('jira_updated_at').notNull(),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const jiraTicketSprints = pgTable(
  'jira_ticket_sprint',
  {
    ticketId: text('ticket_id')
      .notNull()
      .references(() => jiraTickets.id, { onDelete: 'cascade' }),
    sprintId: text('sprint_id')
      .notNull()
      .references(() => jiraSprints.id, { onDelete: 'cascade' }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.ticketId, t.sprintId] }) })
)

export const jiraStatusHistory = pgTable('jira_status_history', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id')
    .notNull()
    .references(() => jiraTickets.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  fromStatusCategory: text('from_status_category'),
  toStatusCategory: text('to_status_category').notNull(),
  authorAccountId: text('author_account_id'),
  authorName: text('author_name'),
  changedAt: timestamp('changed_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const jiraEvents = pgTable('jira_event', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id').references(() => jiraConnections.id),
  eventType: text('event_type').notNull(),
  payload: text('payload').notNull(),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
