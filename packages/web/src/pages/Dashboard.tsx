import { Link } from 'react-router-dom'
import { Plug } from 'lucide-react'
import { useGetDashboardSummaryQuery } from '@/api/dashboardApi'
import { formatHours } from '@/lib/health'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ThroughputChart } from '@/components/dashboard/ThroughputChart'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-4 h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <Plug className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">No data yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Connect your GitHub App and Jira account to start seeing project health metrics here.
        </p>
        <Button asChild className="mt-6">
          <Link to="/integrations">Connect integrations</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { data, isLoading, isError } = useGetDashboardSummaryQuery()

  const isEmpty =
    !isLoading &&
    data &&
    data.prs.totalPrs === 0 &&
    data.projects.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          {data?.github.accountLogin
            ? `Engineering overview for ${data.github.accountLogin}`
            : 'Your engineering overview'}
        </p>
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <p className="text-sm text-destructive">Failed to load dashboard data. Please refresh.</p>
      )}

      {isEmpty && <EmptyState />}

      {data && !isEmpty && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard
              label="Open PRs"
              value={data.prs.openPrs}
              sub={`of ${data.prs.totalPrs} total`}
            />
            <MetricCard
              label="Merge Rate"
              value={`${data.prs.mergeRate}%`}
              sub={`${data.prs.mergedPrs} merged`}
            />
            <MetricCard
              label="PR Cycle Time"
              value={formatHours(data.prs.cycleTimeHours.median)}
              sub="median open → merged"
            />
            <MetricCard
              label="Review Lag"
              value={formatHours(data.prs.reviewLagHours.median)}
              sub="median to first review"
            />
          </div>

          <ThroughputChart data={data.prs.throughputByWeek} />

          {data.projects.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Projects
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.projects.map((project) => (
                  <ProjectCard key={project.projectId} project={project} />
                ))}
              </div>
            </section>
          )}

          {data.projects.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No Jira projects connected yet.{' '}
                  <Link to="/integrations" className="text-primary underline-offset-4 hover:underline">
                    Connect Jira
                  </Link>{' '}
                  to see project health cards here.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
