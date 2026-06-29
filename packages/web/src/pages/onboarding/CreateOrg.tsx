import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
})

type FormData = z.infer<typeof createOrgSchema>

export function CreateOrg() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (session?.session.activeOrganizationId) {
      navigate('/onboarding/connect-github', { replace: true })
    }
  }, [session, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(createOrgSchema) })

  const onSubmit = async (data: FormData) => {
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: org, error } = await authClient.organization.create({ name: data.name, slug })
    if (error || !org) {
      setError('root', { message: error?.message ?? 'Could not create organization' })
      return
    }

    await authClient.organization.setActive({ organizationId: org.id })
    navigate('/onboarding/connect-github')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>
          Set up a workspace to track your team&apos;s engineering health.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              placeholder="Acme Engineering"
              autoFocus
              {...register('name')}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
