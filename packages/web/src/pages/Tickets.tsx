import { Link } from 'react-router-dom'
import { ListTodo } from 'lucide-react'
import { useGetTicketsQuery } from '@/api/ticketsApi'
import { TicketsTable } from '@/components/tickets/TicketsTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function TicketsSkeleton() {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b py-3 last:border-0">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-5 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
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
        <ListTodo className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">No tickets yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Connect your Jira account and sync your projects to start tracking tickets here.
        </p>
        <Button asChild className="mt-6">
          <Link to="/integrations">Connect integrations</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function Tickets() {
  const { data, isLoading, isError } = useGetTicketsQuery({})

  const isEmpty = !isLoading && data && data.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
        <p className="mt-1 text-muted-foreground">All Jira tickets across your connected projects</p>
      </div>

      {isLoading && <TicketsSkeleton />}

      {isError && (
        <p className="text-sm text-destructive">Failed to load tickets. Please refresh.</p>
      )}

      {isEmpty && <EmptyState />}

      {data && !isEmpty && (
        <Card>
          <CardContent className="pt-0 pb-2">
            <TicketsTable tickets={data} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
