import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Settings } from './Settings'

const { mockUseSession, mockUseActiveOrganization, mockUseActiveMember } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockUseActiveOrganization: vi.fn(),
  mockUseActiveMember: vi.fn(),
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
    useActiveOrganization: mockUseActiveOrganization,
    useActiveMember: mockUseActiveMember,
    organization: {
      update: vi.fn(),
      removeMember: vi.fn(),
      updateMemberRole: vi.fn(),
      cancelInvitation: vi.fn(),
      inviteMember: vi.fn(),
    },
  },
}))

const mockMember = {
  id: 'mem-1',
  userId: 'user-1',
  role: 'owner',
  createdAt: new Date('2024-01-01'),
  user: { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com' },
}

const mockOrg = {
  name: 'Acme Corp',
  slug: 'acme-corp',
  createdAt: new Date('2024-01-01'),
  members: [mockMember],
  invitations: [
    {
      id: 'inv-1',
      email: 'bob@example.com',
      role: 'member',
      status: 'pending',
      expiresAt: new Date('2025-12-31'),
      createdAt: new Date('2024-01-01'),
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ data: { user: { id: 'user-1' }, session: {} } })
  mockUseActiveOrganization.mockReturnValue({ data: mockOrg })
})

describe('Settings page', () => {
  it('renders InviteMemberCard and InvitationsCard for owner role', () => {
    mockUseActiveMember.mockReturnValue({ data: { role: 'owner' } })
    render(<MemoryRouter><Settings /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /send invite/i })).not.toBeNull()
    expect(screen.queryByText(/pending invitations/i)).not.toBeNull()
  })

  it('hides InviteMemberCard and InvitationsCard for member role', () => {
    mockUseActiveMember.mockReturnValue({ data: { role: 'member' } })
    render(<MemoryRouter><Settings /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /send invite/i })).toBeNull()
    // InvitationsCard returns null when canManage is false (never rendered)
    expect(screen.queryByText(/pending invitations/i)).toBeNull()
  })
})
