import { useState, type ReactNode } from 'react'
import { Github, CheckCircle2, Clock, AlertCircle, ExternalLink, Link2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  useGetGithubInstallationsQuery,
  useGetJiraConnectionsQuery,
  type GithubInstallation,
  type JiraConnection,
} from '@/api/onboardingApi'
import {
  useGetInstallationRepositoriesQuery,
  useDeleteGithubInstallationMutation,
  useGetConnectionProjectsQuery,
  useDeleteJiraConnectionMutation,
  type Repository,
  type JiraProject,
} from '@/api/integrationsApi'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SyncStatusIcon({ syncedAt, suspended }: { syncedAt: string | null; suspended?: boolean }) {
  if (suspended) return <AlertCircle className="h-4 w-4 text-destructive" />
  if (syncedAt) return <CheckCircle2 className="h-4 w-4 text-primary" />
  return <Clock className="h-4 w-4 text-muted-foreground" />
}

function SyncBadge({ syncedAt, suspended }: { syncedAt: string | null; suspended?: boolean }) {
  if (suspended) return <Badge variant="destructive">Suspended</Badge>
  if (syncedAt) return <Badge>Synced</Badge>
  return <Badge variant="outline">Pending sync</Badge>
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  )
}

function EmptyIntegration({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{action}</div>
    </div>
  )
}

function DisconnectControls({
  onConfirm,
  isLoading,
}: {
  onConfirm: () => void
  isLoading: boolean
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Disconnect?</span>
        <Button variant="destructive" size="sm" disabled={isLoading} onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      Disconnect
    </Button>
  )
}

// --- GitHub ---

function GitHubRepoRow({ repo }: { repo: Repository }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-sm">
        {repo.fullName}
        {repo.private && (
          <Badge variant="outline" className="ml-2 text-xs">
            Private
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{repo.language ?? '—'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <SyncStatusIcon syncedAt={repo.syncedAt} />
          <span className="text-xs text-muted-foreground">{formatDate(repo.syncedAt)}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function GitHubInstallationCard({
  installation,
  installUrl,
}: {
  installation: GithubInstallation
  installUrl: string | null
}) {
  const { data: repos, isLoading: reposLoading } = useGetInstallationRepositoriesQuery(
    installation.id,
  )
  const [deleteInstallation, { isLoading: isDeleting }] = useDeleteGithubInstallationMutation()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">@{installation.accountLogin}</span>
            <Badge variant="secondary" className="text-xs">
              {installation.accountType}
            </Badge>
            <SyncBadge syncedAt={installation.syncedAt} />
          </div>
          <p className="text-sm text-muted-foreground">
            Connected {formatDate(installation.createdAt)} · Last synced{' '}
            {formatDate(installation.syncedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {installUrl && (
            <a href={installUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Manage App
              </Button>
            </a>
          )}
          <DisconnectControls
            onConfirm={() => deleteInstallation(installation.id)}
            isLoading={isDeleting}
          />
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Repositories{repos ? ` (${repos.length})` : ''}
        </p>
        {reposLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : repos && repos.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Last synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repos.map((repo) => (
                <GitHubRepoRow key={repo.id} repo={repo} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No repositories found.</p>
        )}
      </div>
    </div>
  )
}

function GitHubSection({ installUrl }: { installUrl: string | null }) {
  const { data: installations, isLoading } = useGetGithubInstallationsQuery()
  const installation = installations?.[0]

  if (isLoading) return <SectionSkeleton />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          <CardTitle className="text-base">GitHub</CardTitle>
        </div>
        {!installation && installUrl && (
          <a href={installUrl}>
            <Button size="sm">
              <Github className="mr-2 h-4 w-4" />
              Install GitHub App
            </Button>
          </a>
        )}
      </CardHeader>
      <CardContent>
        {installation ? (
          <GitHubInstallationCard installation={installation} installUrl={installUrl} />
        ) : (
          <EmptyIntegration
            icon={<Github className="h-8 w-8" />}
            title="GitHub not connected"
            description="Install the Backspin GitHub App to sync pull requests, commits, and code review data."
            action={
              installUrl ? (
                <a href={installUrl}>
                  <Button>
                    <Github className="mr-2 h-4 w-4" />
                    Install GitHub App
                  </Button>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Set{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">
                    VITE_GITHUB_APP_SLUG
                  </code>{' '}
                  to enable GitHub integration.
                </p>
              )
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

// --- Jira ---

function JiraProjectRow({ project }: { project: JiraProject }) {
  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className="font-mono text-xs">
          {project.key}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{project.name}</TableCell>
      <TableCell className="text-sm capitalize text-muted-foreground">
        {project.projectType ?? '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <SyncStatusIcon syncedAt={project.syncedAt} />
          <span className="text-xs text-muted-foreground">{formatDate(project.syncedAt)}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function JiraConnectionCard({
  connection,
  jiraConnectUrl,
}: {
  connection: JiraConnection
  jiraConnectUrl: string | null
}) {
  const { data: projects, isLoading: projectsLoading } = useGetConnectionProjectsQuery(
    connection.id,
  )
  const [deleteConnection, { isLoading: isDeleting }] = useDeleteJiraConnectionMutation()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{connection.cloudName}</span>
            <SyncBadge syncedAt={connection.syncedAt} suspended={connection.suspended} />
          </div>
          <p className="text-sm text-muted-foreground">
            <a
              href={connection.cloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {connection.cloudUrl}
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            Connected {formatDate(connection.createdAt)} · Last synced{' '}
            {formatDate(connection.syncedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {jiraConnectUrl && (
            <a href={jiraConnectUrl}>
              <Button variant="outline" size="sm">
                Reconnect
              </Button>
            </a>
          )}
          <DisconnectControls
            onConfirm={() => deleteConnection(connection.id)}
            isLoading={isDeleting}
          />
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Projects{projects ? ` (${projects.length})` : ''}
        </p>
        {projectsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last synced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <JiraProjectRow key={project.id} project={project} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No projects found.</p>
        )}
      </div>
    </div>
  )
}

function JiraSection({ jiraConnectUrl }: { jiraConnectUrl: string | null }) {
  const { data: connections, isLoading } = useGetJiraConnectionsQuery()
  const connection = connections?.[0]

  if (isLoading) return <SectionSkeleton />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          <CardTitle className="text-base">Jira</CardTitle>
        </div>
        {!connection && jiraConnectUrl && (
          <a href={jiraConnectUrl}>
            <Button size="sm">Connect Jira</Button>
          </a>
        )}
      </CardHeader>
      <CardContent>
        {connection ? (
          <JiraConnectionCard connection={connection} jiraConnectUrl={jiraConnectUrl} />
        ) : (
          <EmptyIntegration
            icon={<Link2 className="h-8 w-8" />}
            title="Jira not connected"
            description="Connect your Jira account to sync projects, issues, and sprint data."
            action={
              jiraConnectUrl ? (
                <a href={jiraConnectUrl}>
                  <Button>Connect Jira</Button>
                </a>
              ) : null
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

// --- Page ---

export function Integrations() {
  const { data: session } = authClient.useSession()
  const activeOrgId = session?.session.activeOrganizationId
  const appSlug = import.meta.env.VITE_GITHUB_APP_SLUG as string | undefined

  const githubInstallUrl =
    appSlug && activeOrgId
      ? `https://github.com/apps/${appSlug}/installations/new?state=${activeOrgId}`
      : null
  const jiraConnectUrl = activeOrgId ? `/api/jira/connect?state=${activeOrgId}` : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-muted-foreground">Manage your GitHub and Jira connections</p>
      </div>
      <GitHubSection installUrl={githubInstallUrl} />
      <JiraSection jiraConnectUrl={jiraConnectUrl} />
    </div>
  )
}
