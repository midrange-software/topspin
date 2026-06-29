import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { healthColor, formatHours } from '@/lib/health'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import type { ProjectSummary } from '@/api/dashboardApi'

export function ProjectsTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Health</TableHead>
          <TableHead className="text-right">Open</TableHead>
          <TableHead className="text-right">In Progress</TableHead>
          <TableHead className="text-right">Done</TableHead>
          <TableHead className="text-right">Stale</TableHead>
          <TableHead className="text-right">Cycle Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.projectId}>
            <TableCell>
              <Link
                to={`/projects/${project.projectId}`}
                className="font-medium hover:underline"
              >
                {project.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono text-xs">
                {project.key}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <span className={cn('font-semibold tabular-nums', healthColor(project.healthScore))}>
                {project.healthScore}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{project.openTickets}</TableCell>
            <TableCell className="text-right tabular-nums">{project.inProgressTickets}</TableCell>
            <TableCell className="text-right tabular-nums">{project.doneTickets}</TableCell>
            <TableCell className="text-right tabular-nums">{project.staleTickets}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatHours(project.cycleTimeHours.median)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
