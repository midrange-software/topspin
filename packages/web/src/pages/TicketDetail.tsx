import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useGetTicketByKeyQuery } from '@/api/ticketsApi'
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

import { statusBadgeVariant, priorityBadgeVariant, prStateBadgeVariant } from '@/lib/formatters'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

export function TicketDetail() {
  const { key } = useParams<{ key: string }>()
  const { data: ticket, isLoading, isError } = useGetTicketByKeyQuery(key!)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tickets
        </Link>
        <DetailSkeleton />
      </div>
    )
  }

  if (isError || !ticket) {
    return (
      <div className="space-y-4">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tickets
        </Link>
        <p className="text-sm text-destructive">Failed to load ticket. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tickets
      </Link>

      <div className="space-y-2">
        <Badge variant="outline" className="font-mono text-xs">
          {ticket.key}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight">{ticket.summary}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusBadgeVariant(ticket.statusCategory)} className="capitalize">
            {ticket.status}
          </Badge>
          {ticket.priority && (
            <Badge variant={priorityBadgeVariant(ticket.priority)} className="capitalize">
              {ticket.priority}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline
            {ticket.statusHistory.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {ticket.statusHistory.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="prs">
            Linked PRs
            {ticket.linkedPrs.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {ticket.linkedPrs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                  <MetaField label="Type">{ticket.type}</MetaField>
                  <MetaField label="Priority">
                    {ticket.priority ? (
                      <Badge variant={priorityBadgeVariant(ticket.priority)} className="capitalize text-xs">
                        {ticket.priority}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </MetaField>
                  <MetaField label="Assignee">
                    {ticket.assigneeName ?? <span className="text-muted-foreground">Unassigned</span>}
                  </MetaField>
                  <MetaField label="Reporter">
                    {ticket.reporterName ?? <span className="text-muted-foreground">—</span>}
                  </MetaField>
                  <MetaField label="Story Points">
                    {ticket.storyPoints != null ? (
                      <span className="font-semibold">{ticket.storyPoints}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </MetaField>
                  <MetaField label="Project">
                    <Badge variant="outline" className="font-mono text-xs">
                      {ticket.projectKey}
                    </Badge>
                    <span className="ml-2 text-muted-foreground">{ticket.projectName}</span>
                  </MetaField>
                  {ticket.epicKey && (
                    <MetaField label="Epic">
                      <Link
                        to={`/tickets/${ticket.epicKey}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {ticket.epicKey}
                      </Link>
                    </MetaField>
                  )}
                  {ticket.parentKey && (
                    <MetaField label="Parent">
                      <Link
                        to={`/tickets/${ticket.parentKey}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {ticket.parentKey}
                      </Link>
                    </MetaField>
                  )}
                  <MetaField label="Created">{formatDate(ticket.jiraCreatedAt)}</MetaField>
                  <MetaField label="Updated">{formatDate(ticket.jiraUpdatedAt)}</MetaField>
                  {ticket.resolvedAt && (
                    <MetaField label="Resolved">{formatDate(ticket.resolvedAt)}</MetaField>
                  )}
                  {ticket.labels && ticket.labels.length > 0 && (
                    <MetaField label="Labels">
                      <div className="flex flex-wrap gap-1">
                        {ticket.labels.map((label) => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </MetaField>
                  )}
                </div>
              </CardContent>
            </Card>

            {ticket.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          {ticket.statusHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No status changes recorded.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <ol className="space-y-4">
                  {ticket.statusHistory.map((entry, i) => (
                    <li key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                        {i < ticket.statusHistory.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-xs text-muted-foreground">{formatDateTime(entry.changedAt)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                          {entry.fromStatus && (
                            <>
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.fromStatus}
                              </Badge>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge
                            variant={statusBadgeVariant(entry.toStatusCategory)}
                            className="text-xs capitalize"
                          >
                            {entry.toStatus}
                          </Badge>
                          {entry.authorName && (
                            <span className="text-xs text-muted-foreground">by {entry.authorName}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Linked PRs */}
        <TabsContent value="prs">
          {ticket.linkedPrs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No linked pull requests found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-0 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Repo</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ticket.linkedPrs.map((pr) => (
                      <TableRow key={pr.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{pr.number}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="line-clamp-1 font-medium">{pr.title}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pr.repoFullName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={prStateBadgeVariant(pr.state, pr.mergedAt)}
                            className="capitalize text-xs"
                          >
                            {pr.mergedAt ? 'merged' : pr.state}
                          </Badge>
                          {pr.draft && !pr.mergedAt && (
                            <Badge variant="outline" className="ml-1 text-xs">draft</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pr.authorLogin ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[140px]">
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {pr.headBranch}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(pr.mergedAt ?? pr.githubCreatedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
