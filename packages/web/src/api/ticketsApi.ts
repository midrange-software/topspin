import { baseApi } from './baseApi'

export type JiraTicket = {
  id: string
  key: string
  summary: string
  type: string
  status: string
  statusCategory: string
  priority: string | null
  assigneeName: string | null
  storyPoints: number | null
  labels: string[] | null
  jiraCreatedAt: string
  jiraUpdatedAt: string
  resolvedAt: string | null
  projectId: string
  projectKey: string
  projectName: string
}

export type StatusHistoryEntry = {
  id: string
  fromStatus: string | null
  toStatus: string
  fromStatusCategory: string | null
  toStatusCategory: string
  authorName: string | null
  changedAt: string
}

export type LinkedPr = {
  id: string
  number: number
  title: string
  state: string
  draft: boolean
  authorLogin: string | null
  headBranch: string
  repoFullName: string
  mergedAt: string | null
  githubCreatedAt: string
}

export type TicketDetail = JiraTicket & {
  description: string | null
  reporterName: string | null
  epicKey: string | null
  parentKey: string | null
  statusHistory: StatusHistoryEntry[]
  linkedPrs: LinkedPr[]
}

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTickets: build.query<JiraTicket[], { projectId?: string }>({
      query: ({ projectId } = {}) =>
        projectId ? `/jira/tickets?projectId=${projectId}` : '/jira/tickets',
      providesTags: ['Ticket'],
    }),
    getTicketByKey: build.query<TicketDetail, string>({
      query: (key) => `/jira/tickets/${key}`,
      providesTags: (_result, _error, key) => [{ type: 'Ticket', id: key }],
    }),
  }),
})

export const { useGetTicketsQuery, useGetTicketByKeyQuery } = ticketsApi
