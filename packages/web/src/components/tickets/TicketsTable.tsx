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

function statusBadgeVariant(statusCategory: string): 'default' | 'secondary' | 'outline' {
  const cat = statusCategory.toLowerCase()
  if (cat === 'done') return 'default'
  if (cat === 'in progress') return 'secondary'
  return 'outline'
}

function priorityBadgeVariant(priority: string | null): 'destructive' | 'secondary' | 'outline' {
  if (!priority) return 'outline'
  const p = priority.toLowerCase()
  if (p === 'highest' || p === 'high') return 'destructive'
  if (p === 'medium') return 'secondary'
  return 'outline'
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

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
