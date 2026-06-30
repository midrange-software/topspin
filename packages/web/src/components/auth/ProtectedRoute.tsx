import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner'

export function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession()
  const location = useLocation()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return <Outlet />
}
