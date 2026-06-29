import { baseApi } from './baseApi'

export type GithubInstallation = {
  id: string
  installationId: number
  organizationId: string
  accountLogin: string
  accountType: string
  syncedAt: string | null
  createdAt: string
}

export type JiraConnection = {
  id: string
  cloudName: string
  cloudUrl: string
  suspended: boolean
  syncedAt: string | null
  createdAt: string
}

export const onboardingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGithubInstallations: build.query<GithubInstallation[], void>({
      query: () => '/github/installations',
      providesTags: ['Integration'],
    }),
    getJiraConnections: build.query<JiraConnection[], void>({
      query: () => '/jira/connections',
      providesTags: ['Integration'],
    }),
  }),
})

export const { useGetGithubInstallationsQuery, useGetJiraConnectionsQuery } = onboardingApi
