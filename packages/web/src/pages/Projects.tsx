import { Link } from 'react-router-dom'
import { Folders } from 'lucide-react'
import { useGetDashboardSummaryQuery } from '@/api/dashboardApi'
import { ProjectsTable } from '@/components/projects/ProjectsTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function ProjectsSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b py-3 last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="ml-auto h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <Folders className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Connect your Jira account and sync your projects to start tracking project health here.
        </p>
        <Button asChild className="mt-6">
          <Link to="/integrations">Connect integrations</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function Projects() {
  const { data, isLoading, isError } = useGetDashboardSummaryQuery()

  const isEmpty = !isLoading && data && data.projects.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="mt-1 text-muted-foreground">Project health and progress</p>
      </div>

      {isLoading && <ProjectsSkeleton />}

      {isError && (
        <p className="text-sm text-destructive">Failed to load projects. Please refresh.</p>
      )}

      {isEmpty && <EmptyState />}

      {data && !isEmpty && (
        <Card>
          <CardContent className="pt-0 pb-2">
            <ProjectsTable projects={data.projects} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
