import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectCard } from './ProjectCard'
import type { ProjectSummary } from '@/api/dashboardApi'

const baseProject: ProjectSummary = {
  projectId: 'proj-1',
  key: 'PROJ',
  name: 'Test Project',
  healthScore: 85,
  totalTickets: 10,
  openTickets: 3,
  inProgressTickets: 2,
  doneTickets: 5,
  staleTickets: 1,
  cycleTimeHours: { median: 24, p75: 48, p95: 72 },
}

describe('ProjectCard', () => {
  it('applies the correct health score color class for a score ≥ 80', () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectCard project={baseProject} />
      </MemoryRouter>
    )
    const healthEl = container.querySelector('.text-emerald-600')
    expect(healthEl).not.toBeNull()
    expect(healthEl?.textContent).toContain('85')
  })

  it('applies amber color class for a health score between 60 and 79', () => {
    const { container } = render(
      <MemoryRouter>
        <ProjectCard project={{ ...baseProject, healthScore: 70 }} />
      </MemoryRouter>
    )
    expect(container.querySelector('.text-amber-600')).not.toBeNull()
  })

  // MVP gap #10 — ProjectCard is not clickable (Dashboard.tsx renders it without a Link wrapper).
  // The card should navigate to the project detail page when clicked.
  it.fails('renders the card inside a link to the project detail page', () => {
    render(
      <MemoryRouter>
        <ProjectCard project={baseProject} />
      </MemoryRouter>
    )
    // Currently no <a> element is rendered — the card has no navigation
    expect(screen.getByRole('link')).not.toBeNull()
  })
})
