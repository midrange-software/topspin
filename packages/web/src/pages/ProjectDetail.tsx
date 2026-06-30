import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { healthColor, healthBgColor, formatHours } from '@/lib/health'
import { useGetDashboardSummaryQuery } from '@/api/dashboardApi'
import {
  useGetProjectHealthQuery,
  useGetProjectTicketMetricsQuery,
  useGetProjectSprintMetricsQuery,
} from '@/api/projectsApi'
import { useGetTicketsQuery } from '@/api/ticketsApi'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ThroughputChart } from '@/components/dashboard/ThroughputChart'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

import { sprintStateBadgeVariant } from '@/lib/formatters'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()

  const { data: summary } = useGetDashboardSummaryQuery()
  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
  } = useGetProjectHealthQuery(projectId!)
  const {
    data: tickets,
    isLoading: ticketsLoading,
    isError: ticketsError,
  } = useGetProjectTicketMetricsQuery(projectId!)
  const {
    data: sprints,
    isLoading: sprintsLoading,
    isError: sprintsError,
  } = useGetProjectSprintMetricsQuery(projectId!)
  const { data: allTickets } = useGetTicketsQuery({ projectId: projectId! })

  const isLoading = healthLoading || ticketsLoading || sprintsLoading
  const isError = healthError || ticketsError || sprintsError

  const project = summary?.projects.find((p) => p.projectId === projectId)

  const sortedSprints = sprints
    ? [...sprints].sort((a, b) => {
        if (a.state === 'active' && b.state !== 'active') return -1
        if (b.state === 'active' && a.state !== 'active') return 1
        const aEnd = a.endDate ? new Date(a.endDate).getTime() : 0
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : 0
        return bEnd - aEnd
      })
    : []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <DetailSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <p className="text-sm text-destructive">Failed to load project data. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        {project && (
          <Badge variant="outline" className="font-mono text-xs">
            {project.key}
          </Badge>
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          {project?.name ?? projectId}
        </h1>
        {health && (
          <span
            className={cn(
              'ml-auto text-3xl font-bold tabular-nums',
              healthColor(health.score)
            )}
          >
            {health.score}
            <span className="ml-1 text-sm font-medium text-muted-foreground">health</span>
          </span>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Work</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          {health && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                  label="Cycle Time Score"
                  value={health.breakdown.cycleTime.score}
                  sub={`${formatHours(health.breakdown.cycleTime.cycleTimeHours)} median`}
                />
                <MetricCard
                  label="Staleness Score"
                  value={health.breakdown.staleness.score}
                  sub={`${Math.round(health.breakdown.staleness.staleRatio * 100)}% stale`}
                />
                <MetricCard
                  label="Throughput Score"
                  value={health.breakdown.throughput.score}
                  sub={`${health.breakdown.throughput.weeklyAvg} tickets/week avg`}
                />
                <MetricCard
                  label="Review Lag Score"
                  value={health.breakdown.reviewLag.score}
                  sub={`${formatHours(health.breakdown.reviewLag.reviewLagHours)} median lag`}
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'Cycle Time', score: health.breakdown.cycleTime.score, weight: '35%' },
                      { label: 'Staleness', score: health.breakdown.staleness.score, weight: '25%' },
                      { label: 'Throughput', score: health.breakdown.throughput.score, weight: '25%' },
                      { label: 'Review Lag', score: health.breakdown.reviewLag.score, weight: '15%' },
                    ].map(({ label, score, weight }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="w-28 text-sm text-muted-foreground">{label}</span>
                        <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', healthBgColor(score))}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <span className={cn('w-8 text-right text-sm font-semibold tabular-nums', healthColor(score))}>
                          {score}
                        </span>
                        <span className="w-8 text-right text-xs text-muted-foreground">{weight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          {tickets && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-5">
                  <MetricCard label="Total" value={tickets.totalTickets} />
                  <MetricCard label="Open" value={tickets.openTickets} />
                  <MetricCard label="In Progress" value={tickets.inProgressTickets} />
                  <MetricCard label="Done" value={tickets.doneTickets} />
                  <MetricCard label="Stale" value={tickets.staleTickets} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="Cycle Time (median)"
                  value={formatHours(tickets.cycleTimeHours.median)}
                />
                <MetricCard
                  label="Cycle Time (p75)"
                  value={formatHours(tickets.cycleTimeHours.p75)}
                />
                <MetricCard
                  label="Cycle Time (p95)"
                  value={formatHours(tickets.cycleTimeHours.p95)}
                />
              </div>
              <ThroughputChart
                data={tickets.throughputByWeek}
                dataKey="completed"
                title="Ticket Throughput — completed per week"
                valueLabel="Completed"
              />
              <div className="flex justify-end">
                <Link
                  to={`/tickets?projectId=${projectId}`}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  View all tickets →
                </Link>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Sprints */}
        <TabsContent value="sprints">
          {sortedSprints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No sprints found for this project.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-0 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sprint</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Tickets</TableHead>
                      <TableHead className="text-right">Story Points</TableHead>
                      <TableHead className="text-right">Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSprints.map((sprint) => {
                      const completionPct =
                        sprint.totalTickets > 0
                          ? Math.round((sprint.completedTickets / sprint.totalTickets) * 100)
                          : 0
                      return (
                        <TableRow key={sprint.sprintId}>
                          <TableCell className="font-medium">{sprint.sprintName}</TableCell>
                          <TableCell>
                            <Badge variant={sprintStateBadgeVariant(sprint.state)} className="capitalize">
                              {sprint.state}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(sprint.startDate)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(sprint.endDate)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sprint.completedTickets}/{sprint.totalTickets}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sprint.completedStoryPoints}/{sprint.totalStoryPoints}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {sprint.totalTickets > 0 ? `${completionPct}%` : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Blocked Work */}
        <TabsContent value="blocked">
          {tickets && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-3xl font-bold tabular-nums">{tickets.staleTickets}</p>
                      <p className="text-sm text-muted-foreground">
                        stale ticket{tickets.staleTickets !== 1 ? 's' : ''}
                        {tickets.totalTickets > 0
                          ? ` — ${Math.round((tickets.staleTickets / tickets.totalTickets) * 100)}% of ${tickets.totalTickets} total`
                          : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {(() => {
                const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                const staleTickets = (allTickets ?? []).filter(
                  (t) =>
                    t.statusCategory.toLowerCase() !== 'done' &&
                    new Date(t.jiraUpdatedAt) < staleThreshold
                )
                return staleTickets.length > 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="divide-y">
                        {staleTickets.map((ticket) => (
                          <div key={ticket.id} className="flex items-center justify-between py-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                  {ticket.key}
                                </span>
                                <span className="truncate text-sm">{ticket.summary}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {ticket.assigneeName ?? 'Unassigned'} · last updated{' '}
                                {new Date(ticket.jiraUpdatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="ml-3 shrink-0 capitalize">
                              {ticket.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              })()}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold">What counts as stale?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A ticket is considered stale when it has not been updated in the past 7 days and
                    its status category is not "Done". Stale tickets often indicate blocked or forgotten
                    work that needs attention.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
