import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicRoute } from '@/components/auth/PublicRoute'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { Tickets } from '@/pages/Tickets'
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
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/projects', element: <Projects /> },
          { path: '/tickets', element: <Tickets /> },
          { path: '/integrations', element: <Integrations /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
    ],
  },
])
