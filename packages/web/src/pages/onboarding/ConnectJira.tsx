import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { useGetJiraConnectionsQuery } from '@/api/onboardingApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConnectJira() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const { data: connections, isLoading } = useGetJiraConnectionsQuery()

  useEffect(() => {
    if (connections && connections.length > 0) {
      navigate('/onboarding/sync', { replace: true })
    }
  }, [connections, navigate])

  const activeOrgId = session?.session.activeOrganizationId
  const jiraConnectUrl = activeOrgId ? `/api/jira/connect?state=${activeOrgId}` : null

  if (isLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Jira</CardTitle>
        <CardDescription>
          Authorize Backspin to read your Jira projects, issues, and sprint data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {jiraConnectUrl ? (
          <a href={jiraConnectUrl} className="block">
            <Button className="w-full" size="lg">
              Connect Jira
            </Button>
          </a>
        ) : (
          <p className="text-sm text-destructive">Session not ready. Please refresh the page.</p>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/onboarding/sync')}
        >
          Skip for now
        </Button>
      </CardContent>
    </Card>
  )
}
