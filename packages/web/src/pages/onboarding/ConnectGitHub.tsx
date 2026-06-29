import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useGetGithubInstallationsQuery } from '@/api/onboardingApi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ConnectGitHub() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const { data: installations, isLoading } = useGetGithubInstallationsQuery()

  useEffect(() => {
    if (installations && installations.length > 0) {
      navigate('/onboarding/connect-jira', { replace: true })
    }
  }, [installations, navigate])

  const activeOrgId = session?.session.activeOrganizationId
  const appSlug = import.meta.env.VITE_GITHUB_APP_SLUG as string | undefined
  const installUrl =
    appSlug && activeOrgId
      ? `https://github.com/apps/${appSlug}/installations/new?state=${activeOrgId}`
      : null

  if (isLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect GitHub</CardTitle>
        <CardDescription>
          Install the Backspin GitHub App to pull pull request, review, and commit data into your
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {installUrl ? (
          <a href={installUrl} className="block">
            <Button className="w-full" size="lg">
              <Github className="mr-2 h-5 w-5" />
              Install GitHub App
            </Button>
          </a>
        ) : (
          <p className="text-sm text-destructive">
            GitHub App is not configured. Set{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              VITE_GITHUB_APP_SLUG
            </code>{' '}
            to enable this step.
          </p>
        )}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/onboarding/connect-jira')}
        >
          Skip for now
        </Button>
      </CardContent>
    </Card>
  )
}
