import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignIn, signInSchema } from './SignIn'

const { mockNavigate, mockSignInEmail } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSignInEmail: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: mockSignInEmail } },
}))

beforeEach(() => vi.clearAllMocks())

function renderSignIn(path = '/signin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SignIn />
    </MemoryRouter>
  )
}

describe('SignIn', () => {
  it('navigates to /dashboard after successful sign-in', async () => {
    mockSignInEmail.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderSignIn()
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })

  // Validation is tested at the schema level because @hookform/resolvers v3 does not
  // support Zod v4's .issues API — the resolver rethrows ZodErrors instead of mapping them.
  it('schema rejects empty email and short password', () => {
    const result = signInSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
    const issues = result.error!.issues
    expect(issues.find((i) => i.path[0] === 'email')?.message).toBe('Enter a valid email')
    expect(issues.find((i) => i.path[0] === 'password')?.message).toBe(
      'Password must be at least 8 characters',
    )
  })

  it('shows the API error message when sign-in fails', async () => {
    mockSignInEmail.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const user = userEvent.setup()
    renderSignIn()
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(screen.queryByText('Invalid credentials')).not.toBeNull())
  })

  // Bug 3: sign-in always navigates to /dashboard, ignoring the ?redirect= query param
  it.fails('navigates to the ?redirect= destination after sign-in', async () => {
    mockSignInEmail.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderSignIn('/signin?redirect=/integrations')
    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/integrations'))
  })
})
