import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberRow, InvitationsCard, OrgProfileCard, InviteMemberCard, inviteMemberSchema } from './Settings'

const { mockOrgUpdate, mockInviteMember } = vi.hoisted(() => ({
  mockOrgUpdate: vi.fn(),
  mockInviteMember: vi.fn(),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    organization: {
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      cancelInvitation: vi.fn(),
      update: mockOrgUpdate,
      inviteMember: mockInviteMember,
    },
  },
}))

beforeEach(() => vi.clearAllMocks())

const baseMember = {
  id: 'mem-1',
  userId: 'user-1',
  role: 'member',
  createdAt: new Date('2024-01-01'),
  user: { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' },
}

function renderMemberRow(overrides: {
  member?: typeof baseMember
  currentUserId?: string
  currentRole?: string
  isRemoving?: boolean
}) {
  const props = {
    member: baseMember,
    currentUserId: 'current-user',
    currentRole: 'owner',
    isRemoving: false,
    onRemove: vi.fn(),
    onRoleChange: vi.fn(),
    ...overrides,
  }
  return render(
    <table>
      <tbody>
        <MemberRow {...props} />
      </tbody>
    </table>
  )
}

describe('MemberRow', () => {
  it('shows (you) and hides remove + role select when viewing own row', () => {
    renderMemberRow({ currentUserId: baseMember.userId })
    expect(screen.queryByText('(you)')).not.toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows role select and remove button when current user is owner and row is another member', () => {
    renderMemberRow({ currentUserId: 'current-user', currentRole: 'owner' })
    expect(screen.queryByRole('combobox')).not.toBeNull()
    expect(screen.queryByRole('button')).not.toBeNull()
  })

  it('shows remove button but a badge (not select) when current user is admin', () => {
    renderMemberRow({ currentUserId: 'current-user', currentRole: 'admin' })
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText('member')).not.toBeNull()
    expect(screen.queryByRole('button')).not.toBeNull()
  })

  it('hides remove button and shows badge when current user is a member', () => {
    renderMemberRow({ currentUserId: 'current-user', currentRole: 'member' })
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText('member')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

const baseInvitation = {
  id: 'inv-1',
  email: 'bob@example.com',
  role: 'member',
  status: 'pending',
  expiresAt: new Date('2025-01-01'),
  createdAt: new Date('2024-12-01'),
}

describe('InvitationsCard', () => {
  it('returns null when there are no pending invitations', () => {
    const { container } = render(
      <InvitationsCard
        invitations={[{ ...baseInvitation, status: 'accepted' }, { ...baseInvitation, id: 'inv-2', status: 'expired' }]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the card when at least one invitation is pending', () => {
    render(<InvitationsCard invitations={[baseInvitation]} />)
    expect(screen.queryByText('bob@example.com')).not.toBeNull()
  })
})

describe('OrgProfileCard', () => {
  const orgProps = { name: 'Acme', slug: 'acme', createdAt: new Date('2024-01-01') }

  it('save button is disabled when form is not dirty', () => {
    render(<OrgProfileCard {...orgProps} />)
    const btn = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('save button is enabled after editing the name', async () => {
    const user = userEvent.setup()
    render(<OrgProfileCard {...orgProps} />)
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Acme Inc')
    const btn = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('save button is re-disabled after a successful save', async () => {
    mockOrgUpdate.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<OrgProfileCard {...orgProps} />)
    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Acme Inc')
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    const btn = screen.getByRole('button', { name: /save changes/i }) as HTMLButtonElement
    await waitFor(() => expect(btn.disabled).toBe(true))
  })
})

describe('InviteMemberCard', () => {
  // Validation tested at schema level — @hookform/resolvers v3 doesn't support Zod v4 .issues API
  it('schema rejects an invalid email address', () => {
    const result = inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'member' })
    expect(result.success).toBe(false)
    const issue = result.error!.issues.find((i) => i.path[0] === 'email')
    expect(issue?.message).toBe('Enter a valid email address')
  })

  it('clears the email field after a successful invite', async () => {
    mockInviteMember.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<InviteMemberCard />)
    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    await user.type(emailInput, 'bob@example.com')
    await user.click(screen.getByRole('button', { name: /send invite/i }))
    await waitFor(() => expect(emailInput.value).toBe(''))
  })

  it('defaults the role select to member', () => {
    render(<InviteMemberCard />)
    const select = screen.getByLabelText(/role/i) as HTMLSelectElement
    expect(select.value).toBe('member')
  })
})
