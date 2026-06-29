import { baseApi } from './baseApi'

export type Repository = {
  id: string
  installationId: string
  githubId: number
  name: string
  fullName: string
  private: boolean
  defaultBranch: string
  language: string | null
  description: string | null
  syncedAt: string | null
  createdAt: string
}

export type JiraProject = {
  id: string
  connectionId: string
  projectId: string
  key: string
  name: string
  projectType: string | null
  syncedAt: string | null
  createdAt: string
}

export const integrationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInstallationRepositories: build.query<Repository[], string>({
      query: (id) => `/github/installations/${id}/repositories`,
      providesTags: (_r, _e, id) => [{ type: 'Integration', id: `repos-${id}` }],
    }),
    deleteGithubInstallation: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/github/installations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Integration'],
    }),
    getConnectionProjects: build.query<JiraProject[], string>({
      query: (id) => `/jira/connections/${id}/projects`,
      providesTags: (_r, _e, id) => [{ type: 'Integration', id: `projects-${id}` }],
    }),
    deleteJiraConnection: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/jira/connections/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Integration'],
    }),
  }),
})

export const {
  useGetInstallationRepositoriesQuery,
  useDeleteGithubInstallationMutation,
  useGetConnectionProjectsQuery,
  useDeleteJiraConnectionMutation,
} = integrationsApi
