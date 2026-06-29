import { baseApi } from './baseApi'

export type PrMetrics = {
  totalPrs: number
  openPrs: number
  mergedPrs: number
  closedPrs: number
  draftPrs: number
  cycleTimeHours: { median: number; p75: number; p95: number }
  reviewLagHours: { median: number; p75: number; p95: number }
  mergeRate: number
  throughputByWeek: Array<{ weekStart: string; merged: number }>
}

export type ProjectSummary = {
  projectId: string
  key: string
  name: string
  healthScore: number
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  doneTickets: number
  staleTickets: number
  cycleTimeHours: { median: number; p75: number; p95: number }
}

export type DashboardSummary = {
  organizationId: string
  github: { connected: boolean; accountLogin: string | null }
  prs: PrMetrics
  projects: ProjectSummary[]
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardSummary: build.query<DashboardSummary, void>({
      query: () => '/metrics/summary',
      providesTags: ['Metrics'],
    }),
  }),
})

export const { useGetDashboardSummaryQuery } = dashboardApi
