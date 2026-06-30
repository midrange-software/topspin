import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { healthColor, formatHours } from '@/lib/health'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProjectSummary } from '@/api/dashboardApi'

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const stats = [
    { label: 'Open', value: project.openTickets },
    { label: 'In Progress', value: project.inProgressTickets },
    { label: 'Done', value: project.doneTickets },
    { label: 'Stale', value: project.staleTickets },
  ]

  return (
    <Link to={`/projects/${project.projectId}`} className="block">
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {project.key}
                </Badge>
                <p className="truncate text-sm font-semibold">{project.name}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className={cn('text-2xl font-bold tabular-nums', healthColor(project.healthScore))}>
                {project.healthScore}
              </span>
              <span className="text-xs text-muted-foreground">health</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {stats.map(({ label, value }) => (
              <div key={label}>
                <p className="text-lg font-semibold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Cycle time (median)</span>
            <span className="font-medium text-foreground">
              {formatHours(project.cycleTimeHours.median)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
