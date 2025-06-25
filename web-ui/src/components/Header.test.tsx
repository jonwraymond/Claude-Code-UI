import { render, screen, fireEvent } from '@testing-library/react'
import Header from './Header'
import { vi } from 'vitest'

describe('Header', () => {
  it('shows connection status', () => {
    render(<Header isConnected={true} onNewChat={() => {}} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('calls onNewChat when button clicked', () => {
    const onNewChat = vi.fn()
    render(<Header isConnected={false} onNewChat={onNewChat} />)
    fireEvent.click(screen.getByText('New Chat'))
    expect(onNewChat).toHaveBeenCalled()
  })
})
