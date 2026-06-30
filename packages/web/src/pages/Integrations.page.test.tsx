import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Integrations } from './Integrations'

const { mockUseSession, mockDeleteInstallation, mockGetInstallations, mockGetRepos, mockGetConnections } =
  vi.hoisted(() => ({
    mockUseSession: vi.fn(),
    mockDeleteInstallation: vi.fn(),
    mockGetInstallations: vi.fn(),
    mockGetRepos: vi.fn(),
    mockGetConnections: vi.fn(),
  }))

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: mockUseSession },
}))

vi.mock('@/api/onboardingApi', () => ({
  useGetGithubInstallationsQuery: mockGetInstallations,
  useGetJiraConnectionsQuery: mockGetConnections,
}))

vi.mock('@/api/integrationsApi', () => ({
  useGetInstallationRepositoriesQuery: mockGetRepos,
  useDeleteGithubInstallationMutation: vi.fn(() => [mockDeleteInstallation, { isLoading: false }]),
  useGetConnectionProjectsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useDeleteJiraConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}))

const mockInstallation = {
  id: 'inst-1',
  installationId: 123,
  organizationId: 'org-1',
  accountLogin: 'my-org',
  accountType: 'Organization',
  syncedAt: null,
  createdAt: '2024-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ data: { session: { activeOrganizationId: 'org-1' } } })
  mockGetInstallations.mockReturnValue({ data: [mockInstallation], isLoading: false })
  mockGetRepos.mockReturnValue({ data: [], isLoading: false })
  mockGetConnections.mockReturnValue({ data: [], isLoading: false })
  mockDeleteInstallation.mockResolvedValue({ data: { ok: true } })
})

describe('Integrations page', () => {
  it('renders the connected GitHub account name', () => {
    render(<MemoryRouter><Integrations /></MemoryRouter>)
    expect(screen.queryByText('@my-org')).not.toBeNull()
  })

  // MVP gap #14 — disconnect mutations silently swallow errors; no error message shown to user
  it.fails('shows an error message when the GitHub disconnect mutation fails', async () => {
    mockDeleteInstallation.mockResolvedValue({ error: { message: 'Network error' } })
    const user = userEvent.setup()
    render(<MemoryRouter><Integrations /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }))
    await user.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(screen.queryByText(/network error/i)).not.toBeNull()
    })
  })
})
