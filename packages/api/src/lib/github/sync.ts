import { eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import {
  githubInstallations,
  repositories,
  branches,
  commits,
  pullRequests,
  pullRequestReviews,
  pullRequestComments,
  githubEvents,
} from '@topspin/db/schema'
import { getGitHubApp } from './app'

type OctokitRepo = {
  id: number
  name: string
  full_name: string
  private: boolean
  default_branch: string
  language?: string | null
  description?: string | null
}

const upsertRepository = async (installationDbId: string, repo: OctokitRepo) => {
  const [row] = await db
    .insert(repositories)
    .values({
      id: crypto.randomUUID(),
      installationId: installationDbId,
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      defaultBranch: repo.default_branch,
      language: repo.language ?? null,
      description: repo.description ?? null,
    })
    .onConflictDoUpdate({
      target: repositories.githubId,
      set: {
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        language: repo.language ?? null,
        description: repo.description ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncBranches = async (octokit: any, repoDbId: string, owner: string, repo: string) => {
  const pages = octokit.paginate.iterator(octokit.rest.repos.listBranches, {
    owner,
    repo,
    per_page: 100,
  })

  for await (const page of pages) {
    for (const branch of page.data) {
      await db
        .insert(branches)
        .values({
          id: crypto.randomUUID(),
          repositoryId: repoDbId,
          name: branch.name,
          sha: branch.commit.sha,
          protected: branch.protected,
        })
        .onConflictDoUpdate({
          target: [branches.repositoryId, branches.name],
          set: { sha: branch.commit.sha, protected: branch.protected, updatedAt: new Date() },
        })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncReviews = async (octokit: any, prDbId: string, owner: string, repo: string, pullNumber: number) => {
  const pages = octokit.paginate.iterator(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  })

  for await (const page of pages) {
    for (const review of page.data) {
      await db
        .insert(pullRequestReviews)
        .values({
          id: crypto.randomUUID(),
          pullRequestId: prDbId,
          githubId: review.id,
          reviewerLogin: review.user?.login ?? null,
          state: review.state,
          body: review.body ?? null,
          submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
        })
        .onConflictDoUpdate({
          target: pullRequestReviews.githubId,
          set: {
            state: review.state,
            body: review.body ?? null,
            submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
            updatedAt: new Date(),
          },
        })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncComments = async (octokit: any, prDbId: string, owner: string, repo: string, issueNumber: number) => {
  const pages = octokit.paginate.iterator(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  })

  for await (const page of pages) {
    for (const comment of page.data) {
      await db
        .insert(pullRequestComments)
        .values({
          id: crypto.randomUUID(),
          pullRequestId: prDbId,
          githubId: comment.id,
          authorLogin: comment.user?.login ?? null,
          body: comment.body ?? '',
          githubCreatedAt: new Date(comment.created_at),
          githubUpdatedAt: new Date(comment.updated_at),
        })
        .onConflictDoUpdate({
          target: pullRequestComments.githubId,
          set: { body: comment.body ?? '', githubUpdatedAt: new Date(comment.updated_at) },
        })
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncPullRequests = async (octokit: any, repoDbId: string, owner: string, repo: string) => {
  const pages = octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    state: 'all',
    per_page: 100,
  })

  for await (const page of pages) {
    for (const pr of page.data) {
      const state = pr.merged_at ? 'merged' : pr.state
      const [prRow] = await db
        .insert(pullRequests)
        .values({
          id: crypto.randomUUID(),
          repositoryId: repoDbId,
          githubId: pr.id,
          number: pr.number,
          title: pr.title,
          body: pr.body ?? null,
          state,
          draft: pr.draft ?? false,
          authorLogin: pr.user?.login ?? null,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
          headSha: pr.head.sha,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
          githubCreatedAt: new Date(pr.created_at),
          githubUpdatedAt: new Date(pr.updated_at),
        })
        .onConflictDoUpdate({
          target: pullRequests.githubId,
          set: {
            title: pr.title,
            body: pr.body ?? null,
            state,
            draft: pr.draft ?? false,
            headSha: pr.head.sha,
            mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
            closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
            githubUpdatedAt: new Date(pr.updated_at),
            updatedAt: new Date(),
          },
        })
        .returning()

      if (prRow) {
        await syncReviews(octokit, prRow.id, owner, repo, pr.number)
        await syncComments(octokit, prRow.id, owner, repo, pr.number)
      }
    }
  }
}

export const performInitialSync = async (installationId: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const octokit = await getGitHubApp().getInstallationOctokit(installationId) as any

  const [installation] = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.installationId, installationId))

  if (!installation) throw new Error(`Installation ${installationId} not found`)

  const pages = octokit.paginate.iterator(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 }
  )

  for await (const page of pages) {
    for (const repo of page.data.repositories) {
      const repoRow = await upsertRepository(installation.id, repo)
      if (!repoRow) continue

      const [owner, name] = repo.full_name.split('/')
      await syncBranches(octokit, repoRow.id, owner, name)
      await syncPullRequests(octokit, repoRow.id, owner, name)
    }
  }

  await db
    .update(githubInstallations)
    .set({ syncedAt: new Date(), updatedAt: new Date() })
    .where(eq(githubInstallations.id, installation.id))
}

export const processWebhookEvent = async (eventId: string) => {
  const [event] = await db
    .select()
    .from(githubEvents)
    .where(eq(githubEvents.id, eventId))

  if (!event) throw new Error(`Event ${eventId} not found`)

  try {
    const payload = JSON.parse(event.payload)

    switch (event.event) {
      case 'installation':
        await handleInstallationEvent(payload)
        break
      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(payload)
        break
      case 'push':
        await handlePushEvent(payload)
        break
      case 'pull_request':
        await handlePullRequestEvent(payload)
        break
      case 'pull_request_review':
        await handlePullRequestReviewEvent(payload)
        break
      case 'pull_request_review_comment':
        await handlePullRequestCommentEvent(payload)
        break
    }

    await db
      .update(githubEvents)
      .set({ processedAt: new Date() })
      .where(eq(githubEvents.id, eventId))
  } catch (err) {
    await db
      .update(githubEvents)
      .set({ error: (err as Error).message })
      .where(eq(githubEvents.id, eventId))
    throw err
  }
}

const handleInstallationEvent = async (payload: { action: string; installation: { id: number } }) => {
  const { action, installation } = payload
  if (action === 'deleted') {
    await db
      .update(githubInstallations)
      .set({ suspended: true, updatedAt: new Date() })
      .where(eq(githubInstallations.installationId, installation.id))
  }
  if (action === 'suspend') {
    await db
      .update(githubInstallations)
      .set({ suspended: true, updatedAt: new Date() })
      .where(eq(githubInstallations.installationId, installation.id))
  }
  if (action === 'unsuspend') {
    await db
      .update(githubInstallations)
      .set({ suspended: false, updatedAt: new Date() })
      .where(eq(githubInstallations.installationId, installation.id))
  }
}

const handleInstallationRepositoriesEvent = async (payload: {
  action: string
  installation: { id: number }
  repositories_added?: OctokitRepo[]
  repositories_removed?: { id: number }[]
}) => {
  const [installation] = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.installationId, payload.installation.id))

  if (!installation) return

  for (const repo of payload.repositories_added ?? []) {
    await upsertRepository(installation.id, {
      ...repo,
      default_branch: 'main',
      language: null,
      description: null,
    })
  }

  for (const repo of payload.repositories_removed ?? []) {
    await db.delete(repositories).where(eq(repositories.githubId, repo.id))
  }
}

const handlePushEvent = async (payload: {
  ref?: string
  after?: string
  repository?: { full_name: string }
  commits?: Array<{
    id: string
    message: string
    timestamp: string
    author?: { name?: string; email?: string; username?: string }
  }>
}) => {
  const fullName = payload.repository?.full_name
  if (!fullName) return

  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.fullName, fullName))

  if (!repo) return

  const branchName = payload.ref?.replace('refs/heads/', '')
  if (branchName && payload.after) {
    await db
      .insert(branches)
      .values({
        id: crypto.randomUUID(),
        repositoryId: repo.id,
        name: branchName,
        sha: payload.after,
        protected: false,
      })
      .onConflictDoUpdate({
        target: [branches.repositoryId, branches.name],
        set: { sha: payload.after, updatedAt: new Date() },
      })
  }

  for (const commit of payload.commits ?? []) {
    await db
      .insert(commits)
      .values({
        id: crypto.randomUUID(),
        repositoryId: repo.id,
        sha: commit.id,
        message: commit.message,
        authorName: commit.author?.name ?? null,
        authorEmail: commit.author?.email ?? null,
        authorLogin: commit.author?.username ?? null,
        committedAt: new Date(commit.timestamp),
      })
      .onConflictDoNothing()
  }
}

const handlePullRequestEvent = async (payload: {
  pull_request: {
    id: number
    number: number
    title: string
    body?: string | null
    state: string
    draft?: boolean
    user?: { login: string }
    head: { ref: string; sha: string }
    base: { ref: string }
    additions?: number
    deletions?: number
    changed_files?: number
    merged_at?: string | null
    closed_at?: string | null
    created_at: string
    updated_at: string
  }
  repository?: { full_name: string }
}) => {
  const fullName = payload.repository?.full_name
  if (!fullName) return

  const [repo] = await db
    .select()
    .from(repositories)
    .where(eq(repositories.fullName, fullName))

  if (!repo) return

  const pr = payload.pull_request
  const state = pr.merged_at ? 'merged' : pr.state

  await db
    .insert(pullRequests)
    .values({
      id: crypto.randomUUID(),
      repositoryId: repo.id,
      githubId: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body ?? null,
      state,
      draft: pr.draft ?? false,
      authorLogin: pr.user?.login ?? null,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      headSha: pr.head.sha,
      additions: pr.additions ?? 0,
      deletions: pr.deletions ?? 0,
      changedFiles: pr.changed_files ?? 0,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      githubCreatedAt: new Date(pr.created_at),
      githubUpdatedAt: new Date(pr.updated_at),
    })
    .onConflictDoUpdate({
      target: pullRequests.githubId,
      set: {
        title: pr.title,
        body: pr.body ?? null,
        state,
        draft: pr.draft ?? false,
        headSha: pr.head.sha,
        additions: pr.additions ?? 0,
        deletions: pr.deletions ?? 0,
        changedFiles: pr.changed_files ?? 0,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        githubUpdatedAt: new Date(pr.updated_at),
        updatedAt: new Date(),
      },
    })
}

const handlePullRequestReviewEvent = async (payload: {
  review: {
    id: number
    state: string
    body?: string | null
    submitted_at?: string | null
    user?: { login: string }
  }
  pull_request?: { id: number }
}) => {
  const prGithubId = payload.pull_request?.id
  if (!prGithubId) return

  const [pr] = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.githubId, prGithubId))

  if (!pr) return

  const review = payload.review
  await db
    .insert(pullRequestReviews)
    .values({
      id: crypto.randomUUID(),
      pullRequestId: pr.id,
      githubId: review.id,
      reviewerLogin: review.user?.login ?? null,
      state: review.state,
      body: review.body ?? null,
      submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
    })
    .onConflictDoUpdate({
      target: pullRequestReviews.githubId,
      set: {
        state: review.state,
        body: review.body ?? null,
        submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
        updatedAt: new Date(),
      },
    })
}

const handlePullRequestCommentEvent = async (payload: {
  action: string
  comment: {
    id: number
    body?: string | null
    created_at: string
    updated_at: string
    user?: { login: string }
  }
  pull_request?: { id: number }
}) => {
  const prGithubId = payload.pull_request?.id
  if (!prGithubId) return

  const [pr] = await db
    .select()
    .from(pullRequests)
    .where(eq(pullRequests.githubId, prGithubId))

  if (!pr) return

  const comment = payload.comment

  if (payload.action === 'deleted') {
    await db
      .delete(pullRequestComments)
      .where(eq(pullRequestComments.githubId, comment.id))
    return
  }

  await db
    .insert(pullRequestComments)
    .values({
      id: crypto.randomUUID(),
      pullRequestId: pr.id,
      githubId: comment.id,
      authorLogin: comment.user?.login ?? null,
      body: comment.body ?? '',
      githubCreatedAt: new Date(comment.created_at),
      githubUpdatedAt: new Date(comment.updated_at),
    })
    .onConflictDoUpdate({
      target: pullRequestComments.githubId,
      set: { body: comment.body ?? '', githubUpdatedAt: new Date(comment.updated_at) },
    })
}
