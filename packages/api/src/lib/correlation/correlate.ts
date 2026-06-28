import { eq, inArray } from 'drizzle-orm'
import { db } from '@topspin/db'
import { pullRequests, repositories, githubInstallations } from '@topspin/db/schema'
import { jiraTickets } from '@topspin/db/schema'
import { prJiraLinks } from '@topspin/db/schema'

const JIRA_KEY_RE = /\b([A-Z][A-Z0-9_]+-\d+)\b/g

export const extractJiraKeys = (text: string): string[] =>
  [...new Set([...text.matchAll(JIRA_KEY_RE)].map((m) => m[1]))]

export const correlatePr = async (prId: string) => {
  const [pr] = await db.select().from(pullRequests).where(eq(pullRequests.id, prId))
  if (!pr) return

  const sources: Array<{ text: string; label: string }> = [
    { text: pr.title, label: 'title' },
    { text: pr.headBranch, label: 'branch' },
  ]
  if (pr.body) sources.push({ text: pr.body, label: 'body' })

  const keySourcesMap = new Map<string, string[]>()
  for (const { text, label } of sources) {
    for (const key of extractJiraKeys(text)) {
      const existing = keySourcesMap.get(key) ?? []
      if (!existing.includes(label)) existing.push(label)
      keySourcesMap.set(key, existing)
    }
  }

  await db.delete(prJiraLinks).where(eq(prJiraLinks.prId, prId))

  if (keySourcesMap.size === 0) return

  const tickets = await db
    .select({ id: jiraTickets.id, key: jiraTickets.key })
    .from(jiraTickets)
    .where(inArray(jiraTickets.key, [...keySourcesMap.keys()]))

  if (tickets.length === 0) return

  await db.insert(prJiraLinks).values(
    tickets.map((ticket) => ({
      prId,
      ticketId: ticket.id,
      matchedKey: ticket.key,
      sources: keySourcesMap.get(ticket.key) ?? [],
    }))
  )
}

export const correlateOrganization = async (organizationId: string) => {
  const prs = await db
    .select({ id: pullRequests.id })
    .from(pullRequests)
    .innerJoin(repositories, eq(pullRequests.repositoryId, repositories.id))
    .innerJoin(githubInstallations, eq(repositories.installationId, githubInstallations.id))
    .where(eq(githubInstallations.organizationId, organizationId))

  for (const pr of prs) {
    await correlatePr(pr.id)
  }
}
