import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import type { JiraTicket } from '@/api/ticketsApi'
import { statusBadgeVariant, priorityBadgeVariant, relativeDate } from '@/lib/formatters'

export function TicketsTable({ tickets }: { tickets: JiraTicket[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Summary</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead className="text-right">Points</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>
              <Link to={`/tickets/${ticket.key}`}>
                <Badge variant="outline" className="font-mono text-xs hover:bg-accent">
                  {ticket.key}
                </Badge>
              </Link>
            </TableCell>
            <TableCell className="max-w-xs">
              <Link
                to={`/tickets/${ticket.key}`}
                className="line-clamp-1 font-medium hover:underline"
              >
                {ticket.summary}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">{ticket.type}</TableCell>
            <TableCell>
              <Badge variant={statusBadgeVariant(ticket.statusCategory)} className="capitalize text-xs">
                {ticket.status}
              </Badge>
            </TableCell>
            <TableCell>
              {ticket.priority ? (
                <Badge variant={priorityBadgeVariant(ticket.priority)} className="capitalize text-xs">
                  {ticket.priority}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-sm">—</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {ticket.assigneeName ?? '—'}
            </TableCell>
            <TableCell className="text-right tabular-nums text-sm">
              {ticket.storyPoints ?? '—'}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono text-xs">
                {ticket.projectKey}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {relativeDate(ticket.jiraUpdatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
