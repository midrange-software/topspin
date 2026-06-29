import { baseApi } from './baseApi'

export type TicketMetrics = {
  projectId: string
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  doneTickets: number
  staleTickets: number
  cycleTimeHours: { median: number; p75: number; p95: number }
  throughputByWeek: Array<{ weekStart: string; completed: number; storyPoints: number }>
}

export type SprintMetrics = {
  sprintId: string
  sprintName: string
  state: string
  startDate: string | null
  endDate: string | null
  totalTickets: number
  completedTickets: number
  completedStoryPoints: number
  totalStoryPoints: number
}

export type HealthScore = {
  organizationId: string
  projectId: string
  score: number
  breakdown: {
    cycleTime: { score: number; cycleTimeHours: number }
    staleness: { score: number; staleRatio: number }
    throughput: { score: number; weeklyAvg: number }
    reviewLag: { score: number; reviewLagHours: number }
  }
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProjectHealth: build.query<HealthScore, string>({
      query: (projectId) => `/metrics/projects/${projectId}/health`,
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
    getProjectTicketMetrics: build.query<TicketMetrics, string>({
      query: (projectId) => `/metrics/projects/${projectId}/tickets`,
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
    getProjectSprintMetrics: build.query<SprintMetrics[], string>({
      query: (projectId) => `/metrics/projects/${projectId}/sprints`,
      providesTags: (_result, _error, projectId) => [{ type: 'Project', id: projectId }],
    }),
  }),
})

export const {
  useGetProjectHealthQuery,
  useGetProjectTicketMetricsQuery,
  useGetProjectSprintMetricsQuery,
} = projectsApi
