import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  it('renders the label and value', () => {
    render(<MetricCard label="Cycle Time" value="12h" />)
    expect(screen.queryByText('Cycle Time')).not.toBeNull()
    expect(screen.queryByText('12h')).not.toBeNull()
  })

  it('renders the sub text when provided', () => {
    render(<MetricCard label="Throughput" value={8} sub="tickets/week" />)
    expect(screen.queryByText('tickets/week')).not.toBeNull()
  })

  it('does not render a sub element when sub is omitted', () => {
    render(<MetricCard label="Throughput" value={8} />)
    expect(screen.queryByText('tickets/week')).toBeNull()
  })
})
