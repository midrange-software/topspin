import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CreateOrg, createOrgSchema } from './CreateOrg'

const { mockNavigate, mockUseSession, mockOrgCreate, mockSetActive } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseSession: vi.fn(),
  mockOrgCreate: vi.fn(),
  mockSetActive: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
    organization: {
      create: mockOrgCreate,
      setActive: mockSetActive,
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ data: null })
  mockSetActive.mockResolvedValue({})
})

function renderCreateOrg() {
  return render(
    <MemoryRouter>
      <CreateOrg />
    </MemoryRouter>
  )
}

describe('CreateOrg', () => {
  it('derives slug from name before calling create', async () => {
    mockOrgCreate.mockResolvedValue({ data: { id: 'org-1' }, error: null })
    const user = userEvent.setup()
    renderCreateOrg()
    await user.type(screen.getByLabelText(/organization name/i), 'Acme & Engineering')
    await user.click(screen.getByRole('button', { name: /create organization/i }))
    await waitFor(() =>
      expect(mockOrgCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme & Engineering', slug: 'acme-engineering' })
      )
    )
  })

  // Validation tested at schema level — @hookform/resolvers v3 doesn't support Zod v4 .issues API
  it('schema rejects names shorter than 2 characters', () => {
    const result = createOrgSchema.safeParse({ name: 'A' })
    expect(result.success).toBe(false)
    const issue = result.error!.issues.find((i) => i.path[0] === 'name')
    expect(issue?.message).toBe('Name must be at least 2 characters')
  })

  it('redirects to connect-github when the session already has an active org', async () => {
    mockUseSession.mockReturnValue({
      data: { session: { activeOrganizationId: 'org-existing' } },
    })
    renderCreateOrg()
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding/connect-github', { replace: true })
    )
  })
})
