import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Basic test to ensure Jest is working
describe('Basic Setup', () => {
  test('Jest is configured correctly', () => {
    expect(true).toBe(true)
  })

  test('React renders correctly', () => {
    const TestComponent = () => <div data-testid="test-div">Hello World</div>
    render(<TestComponent />)
    expect(screen.getByTestId('test-div')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})
