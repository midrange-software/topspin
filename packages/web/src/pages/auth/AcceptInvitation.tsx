import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '@/lib/auth-client'
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function AcceptInvitation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link.')
      return
    }
    authClient.organization.acceptInvitation({ invitationId: token })
      .then(({ error }) => {
        if (error) {
          setError(error.message ?? 'Failed to accept invitation.')
        } else {
          navigate('/dashboard', { replace: true })
        }
      })
  }, [token, navigate])

  if (!error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Invitation error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/signin">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
