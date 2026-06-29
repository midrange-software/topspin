import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users, UserMinus, UserPlus } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const ROLES = ['owner', 'admin', 'member'] as const
type OrgRole = (typeof ROLES)[number]

import { roleBadgeVariant, nameInitials } from '@/lib/formatters'

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Org Profile ---

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(64),
})
type ProfileForm = z.infer<typeof profileSchema>

export function OrgProfileCard({
  name,
  slug,
  createdAt,
}: {
  name: string
  slug: string
  createdAt: Date
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  })

  const onSubmit = async (data: ProfileForm) => {
    const { error } = await authClient.organization.update({ data: { name: data.name } })
    if (error) {
      setError('root', { message: error.message ?? 'Failed to update organization' })
      return
    }
    reset({ name: data.name })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization profile</CardTitle>
        <CardDescription>Update your organization's display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input id="org-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Slug
            </p>
            <p className="font-mono text-sm text-muted-foreground">{slug}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Created
            </p>
            <p className="text-sm text-muted-foreground">{formatDate(createdAt)}</p>
          </div>
          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// --- Members ---

type Member = {
  id: string
  userId: string
  role: string
  createdAt: Date
  user: { id: string; name: string; email: string; image?: string }
}

export function MemberRow({
  member,
  currentUserId,
  currentRole,
  isRemoving,
  onRemove,
  onRoleChange,
}: {
  member: Member
  currentUserId: string
  currentRole: string
  isRemoving: boolean
  onRemove: () => void
  onRoleChange: (role: OrgRole) => void
}) {
  const isSelf = member.userId === currentUserId
  const canRemove = (currentRole === 'owner' || currentRole === 'admin') && !isSelf
  const canChangeRole = currentRole === 'owner' && !isSelf

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{nameInitials(member.user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium leading-none">
              {member.user.name}
              {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{member.user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {canChangeRole ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(e.target.value as OrgRole)}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
            {member.role}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(member.createdAt)}</TableCell>
      <TableCell>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-destructive hover:text-destructive"
            disabled={isRemoving}
            onClick={onRemove}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function MembersCard({
  members,
  currentUserId,
  currentRole,
}: {
  members: Member[]
  currentUserId: string
  currentRole: string
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemove = async (member: Member) => {
    setRemovingId(member.id)
    await authClient.organization.removeMember({ memberIdOrEmail: member.id })
    setRemovingId(null)
  }

  const handleRoleChange = async (member: Member, role: OrgRole) => {
    await authClient.organization.updateMemberRole({ memberId: member.id, role })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-4">
        <Users className="h-4 w-4" />
        <CardTitle className="text-base">Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="pb-2 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                currentRole={currentRole}
                isRemoving={removingId === member.id}
                onRemove={() => handleRemove(member)}
                onRoleChange={(role) => handleRoleChange(member, role)}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// --- Pending invitations ---

type Invitation = {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  createdAt: Date
}

export function InvitationsCard({ invitations }: { invitations: Invitation[] }) {
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const pending = invitations.filter((i) => i.status === 'pending')
  if (pending.length === 0) return null

  const handleCancel = async (invitationId: string) => {
    setCancelingId(invitationId)
    await authClient.organization.cancelInvitation({ invitationId })
    setCancelingId(null)
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Pending invitations ({pending.length})</CardTitle>
      </CardHeader>
      <CardContent className="pb-2 pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="text-sm">{inv.email}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant(inv.role)} className="capitalize">
                    {inv.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(inv.expiresAt)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-muted-foreground"
                    disabled={cancelingId === inv.id}
                    onClick={() => handleCancel(inv.id)}
                  >
                    Cancel
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// --- Invite member ---

export const inviteMemberSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.enum(['admin', 'member']),
})
type InviteForm = z.infer<typeof inviteMemberSchema>

export function InviteMemberCard() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'member' },
  })

  const onSubmit = async (data: InviteForm) => {
    const { error } = await authClient.organization.inviteMember({
      email: data.email,
      role: data.role,
    })
    if (error) {
      setError('root', { message: error.message ?? 'Failed to send invitation' })
      return
    }
    reset()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <CardTitle className="text-base">Invite member</CardTitle>
        </div>
        <CardDescription>Send an invitation to add someone to your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              {...register('role')}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Inviting...' : 'Send invite'}
          </Button>
        </form>
        {errors.root && <p className="mt-2 text-sm text-destructive">{errors.root.message}</p>}
      </CardContent>
    </Card>
  )
}

// --- Loading skeleton ---

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// --- Page ---

export function Settings() {
  const { data: org } = authClient.useActiveOrganization()
  const { data: activeMember } = authClient.useActiveMember()
  const { data: session } = authClient.useSession()

  if (!org || !activeMember || !session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your organization</p>
        </div>
        <PageSkeleton />
      </div>
    )
  }

  const currentRole = activeMember.role
  const canManage = currentRole === 'owner' || currentRole === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your organization</p>
      </div>
      <OrgProfileCard name={org.name} slug={org.slug} createdAt={org.createdAt} />
      <MembersCard
        members={org.members}
        currentUserId={session.user.id}
        currentRole={currentRole}
      />
      {canManage && <InvitationsCard invitations={org.invitations} />}
      {canManage && <InviteMemberCard />}
    </div>
  )
}
