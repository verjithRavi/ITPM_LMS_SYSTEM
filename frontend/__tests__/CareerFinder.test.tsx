import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CareerFinder from '@/components/career/CareerFinder'

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  Briefcase: () => <div data-testid="briefcase-icon">Briefcase</div>,
  Code: () => <div data-testid="code-icon">Code</div>,
  Database: () => <div data-testid="database-icon">Database</div>,
  Palette: () => <div data-testid="palette-icon">Palette</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
  Cloud: () => <div data-testid="cloud-icon">Cloud</div>,
  Brain: () => <div data-testid="brain-icon">Brain</div>,
  Send: () => <div data-testid="send-icon">Send</div>,
  ArrowRight: () => <div data-testid="arrow-icon">Arrow</div>,
  CheckCircle: () => <div data-testid="check-icon">Check</div>,
}))

describe('CareerFinder Component', () => {
  test('renders career finder form correctly', () => {
    render(<CareerFinder />)
    
    expect(screen.getByText('Career Finder')).toBeInTheDocument()
    expect(screen.getByText('Discover your ideal IT career path based on your interests and skills')).toBeInTheDocument()
    expect(screen.getByText('Section 1 of 7')).toBeInTheDocument()
  })

  test('shows basic information section initially', () => {
    render(<CareerFinder />)
    
    expect(screen.getByText('🟢 Basic Information')).toBeInTheDocument()
    expect(screen.getByText('Full Name')).toBeInTheDocument()
    expect(screen.getByText('Email (must end with @gmail.com)')).toBeInTheDocument()
    expect(screen.getByText('Current Study Level')).toBeInTheDocument()
  })

  test('has navigation buttons', () => {
    render(<CareerFinder />)
    
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  test('shows progress bar', () => {
    render(<CareerFinder />)
    
    expect(screen.getByText('14% Complete')).toBeInTheDocument()
  })

  test('renders study level options', () => {
    render(<CareerFinder />)
    
    expect(screen.getByText('Select your level')).toBeInTheDocument()
    expect(screen.getByText('1st Year')).toBeInTheDocument()
    expect(screen.getByText('2nd Year')).toBeInTheDocument()
    expect(screen.getByText('3rd Year')).toBeInTheDocument()
    expect(screen.getByText('Final Year')).toBeInTheDocument()
    expect(screen.getByText('Graduate')).toBeInTheDocument()
  })

  test('has form inputs with correct types', () => {
    render(<CareerFinder />)
    
    const inputs = screen.getAllByRole('textbox')
    const selects = screen.getAllByRole('combobox')
    
    expect(inputs.length).toBeGreaterThan(0)
    expect(selects.length).toBeGreaterThan(0)
  })

  test('renders briefcase icon', () => {
    render(<CareerFinder />)
    
    expect(screen.getByTestId('briefcase-icon')).toBeInTheDocument()
    expect(screen.getByTestId('briefcase-icon')).toHaveTextContent('Briefcase')
  })
})
