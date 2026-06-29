import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemberRow, InvitationsCard } from './Settings'

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    organization: {
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      cancelInvitation: vi.fn(),
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
