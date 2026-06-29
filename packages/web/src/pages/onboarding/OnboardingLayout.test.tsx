import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingLayout } from './OnboardingLayout'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <OnboardingLayout />
    </MemoryRouter>
  )
}

describe('OnboardingLayout step indicators', () => {
  it('marks step 0 as complete, step 1 as active, steps 2-3 as future at connect-github', () => {
    const { container } = renderAt('/onboarding/connect-github')
    const circles = container.querySelectorAll('.rounded-full')
    // 4 steps → 4 circle divs
    expect(circles).toHaveLength(4)

    const [step0, step1, step2, step3] = Array.from(circles)

    // complete: has bg-primary
    expect(step0.className).toContain('bg-primary')

    // active: has text-primary but NOT bg-primary
    expect(step1.className).toContain('text-primary')
    expect(step1.className).not.toContain('bg-primary')

    // future steps: border-muted-foreground/30
    expect(step2.className).toContain('border-muted-foreground/30')
    expect(step3.className).toContain('border-muted-foreground/30')
  })

  it('marks all steps before sync as complete, sync as active', () => {
    const { container } = renderAt('/onboarding/sync')
    const circles = container.querySelectorAll('.rounded-full')
    const [step0, step1, step2, step3] = Array.from(circles)

    expect(step0.className).toContain('bg-primary')
    expect(step1.className).toContain('bg-primary')
    expect(step2.className).toContain('bg-primary')

    expect(step3.className).toContain('text-primary')
    expect(step3.className).not.toContain('bg-primary')
  })
})
