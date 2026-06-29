import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SignUp, signUpSchema } from './SignUp'

const { mockNavigate, mockSignUpEmail } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSignUpEmail: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('@/lib/auth-client', () => ({
  authClient: { signUp: { email: mockSignUpEmail } },
}))

beforeEach(() => vi.clearAllMocks())

function renderSignUp() {
  return render(
    <MemoryRouter>
      <SignUp />
    </MemoryRouter>
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, overrides: {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
} = {}) {
  const { name = 'Alice Smith', email = 'alice@example.com', password = 'password1', confirmPassword = password } = overrides
  if (name) await user.type(screen.getByLabelText(/^name$/i), name)
  if (email) await user.type(screen.getByLabelText(/email/i), email)
  if (password) await user.type(screen.getByLabelText(/^password$/i), password)
  if (confirmPassword) await user.type(screen.getByLabelText(/confirm password/i), confirmPassword)
}

// Validation is tested at the schema level because @hookform/resolvers v3 does not
// support Zod v4's .issues API — the resolver rethrows ZodErrors instead of mapping them.
describe('signUpSchema', () => {
  it('reports password mismatch when passwords differ', () => {
    const result = signUpSchema.safeParse({
      name: 'Alice',
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'different!',
    })
    expect(result.success).toBe(false)
    const issue = result.error!.issues.find((i) => i.path[0] === 'confirmPassword')
    expect(issue?.message).toBe('Passwords do not match')
  })

  it('requires a non-empty name', () => {
    const result = signUpSchema.safeParse({
      name: '',
      email: 'a@b.com',
      password: 'password1',
      confirmPassword: 'password1',
    })
    expect(result.success).toBe(false)
    const issue = result.error!.issues.find((i) => i.path[0] === 'name')
    expect(issue?.message).toBe('Name is required')
  })
})

describe('SignUp', () => {

  it('shows the API error message when sign-up fails', async () => {
    mockSignUpEmail.mockResolvedValue({ error: { message: 'Email already in use' } })
    const user = userEvent.setup()
    renderSignUp()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(screen.queryByText('Email already in use')).not.toBeNull())
  })

  it('navigates to /onboarding/create-org on successful sign-up', async () => {
    mockSignUpEmail.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    renderSignUp()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/onboarding/create-org'))
  })
})
