import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

function Hello({ name }) {
  return <p>Hello, {name}!</p>
}

describe('Vitest + @testing-library/react smoke test', () => {
  it('renders a React component', () => {
    render(<Hello name="Alliance" />)
    expect(screen.getByText('Hello, Alliance!')).toBeInTheDocument()
  })
})
