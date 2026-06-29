import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DisconnectControls } from './Integrations'

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(() => ({ data: null, isPending: false })),
  },
}))

// RTK Query hooks used by other components in the file — not needed for DisconnectControls
vi.mock('@/api/onboardingApi', () => ({
  useGetGithubInstallationsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useGetJiraConnectionsQuery: vi.fn(() => ({ data: [], isLoading: false })),
}))

vi.mock('@/api/integrationsApi', () => ({
  useGetInstallationRepositoriesQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useDeleteGithubInstallationMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useGetConnectionProjectsQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useDeleteJiraConnectionMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}))

beforeEach(() => vi.clearAllMocks())

describe('DisconnectControls', () => {
  it('shows the Disconnect button in the initial state', () => {
    render(<DisconnectControls onConfirm={vi.fn()} isLoading={false} />)
    expect(screen.queryByRole('button', { name: /^disconnect$/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull()
  })

  it('shows confirmation UI after clicking Disconnect', async () => {
    const user = userEvent.setup()
    render(<DisconnectControls onConfirm={vi.fn()} isLoading={false} />)
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }))
    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeNull()
  })

  it('reverts to initial state after clicking Cancel', async () => {
    const user = userEvent.setup()
    render(<DisconnectControls onConfirm={vi.fn()} isLoading={false} />)
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('button', { name: /^disconnect$/i })).not.toBeNull()
    expect(screen.queryByRole('button', { name: /confirm/i })).toBeNull()
  })

  it('disables the Confirm button while isLoading is true', async () => {
    const user = userEvent.setup()
    render(<DisconnectControls onConfirm={vi.fn()} isLoading={true} />)
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }))
    const confirmBtn = screen.getByRole('button', { name: /confirm/i }) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
  })
})
