import { boolean, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const githubInstallations = pgTable('github_installation', {
  id: text('id').primaryKey(),
  installationId: integer('installation_id').notNull().unique(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  accountLogin: text('account_login').notNull(),
  accountType: text('account_type').notNull(),
  suspended: boolean('suspended').notNull().default(false),
  syncedAt: timestamp('synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const repositories = pgTable('repository', {
  id: text('id').primaryKey(),
  installationId: text('installation_id')
    .notNull()
    .references(() => githubInstallations.id, { onDelete: 'cascade' }),
  githubId: integer('github_id').notNull().unique(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull().unique(),
  private: boolean('private').notNull(),
  defaultBranch: text('default_branch').notNull().default('main'),
  language: text('language'),
  description: text('description'),
  syncedAt: timestamp('synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const branches = pgTable(
  'branch',
  {
    id: text('id').primaryKey(),
    repositoryId: text('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sha: text('sha').notNull(),
    protected: boolean('protected').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: unique('branch_repo_name_unique').on(t.repositoryId, t.name) })
)

export const commits = pgTable(
  'commit',
  {
    id: text('id').primaryKey(),
    repositoryId: text('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    sha: text('sha').notNull(),
    message: text('message').notNull(),
    authorName: text('author_name'),
    authorEmail: text('author_email'),
    authorLogin: text('author_login'),
    additions: integer('additions').default(0),
    deletions: integer('deletions').default(0),
    committedAt: timestamp('committed_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: unique('commit_repo_sha_unique').on(t.repositoryId, t.sha) })
)

export const pullRequests = pgTable(
  'pull_request',
  {
    id: text('id').primaryKey(),
    repositoryId: text('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    githubId: integer('github_id').notNull().unique(),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    state: text('state').notNull(),
    draft: boolean('draft').notNull().default(false),
    authorLogin: text('author_login'),
    headBranch: text('head_branch').notNull(),
    baseBranch: text('base_branch').notNull(),
    headSha: text('head_sha').notNull(),
    additions: integer('additions').default(0),
    deletions: integer('deletions').default(0),
    changedFiles: integer('changed_files').default(0),
    mergedAt: timestamp('merged_at'),
    closedAt: timestamp('closed_at'),
    githubCreatedAt: timestamp('github_created_at').notNull(),
    githubUpdatedAt: timestamp('github_updated_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ uniq: unique('pr_repo_number_unique').on(t.repositoryId, t.number) })
)

export const pullRequestReviews = pgTable('pull_request_review', {
  id: text('id').primaryKey(),
  pullRequestId: text('pull_request_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  githubId: integer('github_id').notNull().unique(),
  reviewerLogin: text('reviewer_login'),
  state: text('state').notNull(),
  body: text('body'),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const pullRequestComments = pgTable('pull_request_comment', {
  id: text('id').primaryKey(),
  pullRequestId: text('pull_request_id')
    .notNull()
    .references(() => pullRequests.id, { onDelete: 'cascade' }),
  githubId: integer('github_id').notNull().unique(),
  authorLogin: text('author_login'),
  body: text('body').notNull(),
  githubCreatedAt: timestamp('github_created_at').notNull(),
  githubUpdatedAt: timestamp('github_updated_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const githubEvents = pgTable('github_event', {
  id: text('id').primaryKey(),
  installationId: integer('installation_id'),
  deliveryId: text('delivery_id').notNull().unique(),
  event: text('event').notNull(),
  action: text('action'),
  payload: text('payload').notNull(),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
