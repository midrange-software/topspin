import { and, eq } from 'drizzle-orm'
import { db } from '@topspin/db'
import { jiraConnections } from '@topspin/db/schema'

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

type AccessibleResource = {
  id: string
  url: string
  name: string
  scopes: string[]
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, init)
    if (res.status !== 429 || attempt === maxRetries) return res
    const retryAfter = Number(res.headers.get('Retry-After') ?? 0)
    const delay = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** attempt, 30000)
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error('fetchWithRetry: unreachable')
}

export class JiraClient {
  constructor(private readonly connectionId: string) {}

  private async getConnection() {
    const [conn] = await db
      .select()
      .from(jiraConnections)
      .where(eq(jiraConnections.id, this.connectionId))
    if (!conn) throw new Error(`Jira connection ${this.connectionId} not found`)
    return conn
  }

  private async getValidToken() {
    const conn = await this.getConnection()

    if (new Date() < conn.accessTokenExpiresAt) {
      return { token: conn.accessToken, cloudId: conn.cloudId }
    }

    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID!,
        client_secret: process.env.JIRA_CLIENT_SECRET!,
        refresh_token: conn.refreshToken,
      }),
    })

    if (!res.ok) throw new Error(`Jira token refresh failed: ${res.status}`)

    const data = (await res.json()) as TokenResponse
    const expiresAt = new Date(Date.now() + data.expires_in * 1000)

    // Optimistic lock: only apply if no other Lambda has already refreshed
    const updated = await db
      .update(jiraConnections)
      .set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        accessTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(and(
        eq(jiraConnections.id, this.connectionId),
        eq(jiraConnections.accessToken, conn.accessToken),
      ))
      .returning()

    if (updated.length > 0) {
      return { token: data.access_token, cloudId: conn.cloudId }
    }

    // Another Lambda refreshed first — re-read and use the new token
    const [refreshed] = await db
      .select()
      .from(jiraConnections)
      .where(eq(jiraConnections.id, this.connectionId))

    return { token: refreshed!.accessToken, cloudId: refreshed!.cloudId }
  }

  async get<T>(path: string): Promise<T> {
    const { token, cloudId } = await this.getValidToken()
    const res = await fetchWithRetry(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Jira API ${path}: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const { token, cloudId } = await this.getValidToken()
    const res = await fetchWithRetry(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(`Jira API POST ${path}: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  }

  async getAgile<T>(path: string): Promise<T> {
    const { token, cloudId } = await this.getValidToken()
    const res = await fetchWithRetry(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0${path}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
    )
    if (!res.ok) throw new Error(`Jira Agile API ${path}: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  }
}

export const exchangeCodeForTokens = async (code: string): Promise<TokenResponse> => {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.JIRA_CLIENT_ID!,
      client_secret: process.env.JIRA_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.API_URL}/api/jira/callback`,
    }),
  })
  if (!res.ok) throw new Error(`Jira code exchange failed: ${res.status}`)
  return res.json() as Promise<TokenResponse>
}

export const getAccessibleResources = async (accessToken: string): Promise<AccessibleResource[]> => {
  const res = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Jira accessible-resources failed: ${res.status}`)
  return res.json() as Promise<AccessibleResource[]>
}
