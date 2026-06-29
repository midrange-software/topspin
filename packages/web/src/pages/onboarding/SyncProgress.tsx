import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGetGithubInstallationsQuery, useGetJiraConnectionsQuery } from '@/api/onboardingApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SyncProgress() {
  const navigate = useNavigate()

  const { data: installations } = useGetGithubInstallationsQuery(undefined, {
    pollingInterval: 4000,
  })
  const { data: connections } = useGetJiraConnectionsQuery(undefined, {
    pollingInterval: 4000,
  })

  const githubConnected = (installations?.length ?? 0) > 0
  const jiraConnected = (connections?.length ?? 0) > 0
  const githubSynced = installations?.some((i) => i.syncedAt) ?? false
  const jiraSynced = connections?.some((c) => c.syncedAt) ?? false

  const allComplete = githubConnected && jiraConnected && githubSynced && jiraSynced

  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => navigate('/dashboard'), 1500)
      return () => clearTimeout(timer)
    }
  }, [allComplete, navigate])

  const items = [
    { label: 'GitHub App installed', done: githubConnected },
    { label: 'Jira connected', done: jiraConnected },
    { label: 'GitHub repositories synced', done: githubSynced },
    { label: 'Jira projects synced', done: jiraSynced },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setting up your workspace</CardTitle>
        <CardDescription>
          {allComplete
            ? 'All set! Redirecting to your dashboard...'
            : 'Syncing your data. This may take a minute.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
              )}
              <span className={cn(item.done ? 'text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        {allComplete ? (
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            Go to dashboard
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            You can{' '}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => navigate('/dashboard')}
            >
              skip to the dashboard
            </button>{' '}
            and finish setup later.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
