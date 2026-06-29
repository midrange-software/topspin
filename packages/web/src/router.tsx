import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { OrgRequiredRoute } from '@/components/auth/OrgRequiredRoute'
import { PublicRoute } from '@/components/auth/PublicRoute'
import { OnboardingLayout } from '@/pages/onboarding/OnboardingLayout'
import { CreateOrg } from '@/pages/onboarding/CreateOrg'
import { ConnectGitHub } from '@/pages/onboarding/ConnectGitHub'
import { ConnectJira } from '@/pages/onboarding/ConnectJira'
import { SyncProgress } from '@/pages/onboarding/SyncProgress'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { ProjectDetail } from '@/pages/ProjectDetail'
import { Tickets } from '@/pages/Tickets'
import { TicketDetail } from '@/pages/TicketDetail'
import { Integrations } from '@/pages/Integrations'
import { Settings } from '@/pages/Settings'

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/signin', element: <SignIn /> },
      { path: '/signup', element: <SignUp /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <OnboardingLayout />,
        children: [
          { path: '/onboarding', element: <Navigate to="/onboarding/create-org" replace /> },
          { path: '/onboarding/create-org', element: <CreateOrg /> },
          { path: '/onboarding/connect-github', element: <ConnectGitHub /> },
          { path: '/onboarding/connect-jira', element: <ConnectJira /> },
          { path: '/onboarding/sync', element: <SyncProgress /> },
        ],
      },
      {
        element: <OrgRequiredRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: <Dashboard /> },
              { path: '/projects', element: <Projects /> },
              { path: '/projects/:projectId', element: <ProjectDetail /> },
              { path: '/tickets', element: <Tickets /> },
              { path: '/tickets/:key', element: <TicketDetail /> },
              { path: '/integrations', element: <Integrations /> },
              { path: '/settings', element: <Settings /> },
            ],
          },
        ],
      },
    ],
  },
])
