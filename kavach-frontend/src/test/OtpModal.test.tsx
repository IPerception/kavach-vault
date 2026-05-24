import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OtpModal } from '../components/OtpModal'
import { useOtpFlow } from '../hooks/useOtpFlow'

vi.mock('../hooks/useOtpFlow')

const mockOpen = vi.fn()
const mockSubmitCode = vi.fn()
const mockReset = vi.fn()

function mockFlowState(overrides: Partial<ReturnType<typeof useOtpFlow>>) {
  vi.mocked(useOtpFlow).mockReturnValue({
    state: 'idle',
    password: null,
    error: null,
    open: mockOpen,
    submitCode: mockSubmitCode,
    reset: mockReset,
    ...overrides,
  } as ReturnType<typeof useOtpFlow>)
}

describe('OtpModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFlowState({})
  })

  it('renders the trigger button', () => {
    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument()
  })

  it('shows code input immediately when state is awaiting-code', async () => {
    mockFlowState({ state: 'awaiting-code' })

    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()
    })
  })

  it('shows loading state on the verify button while revealing', async () => {
    mockFlowState({ state: 'revealing' })

    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => {
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument()
    })
  })

  it('shows revealed password when state is revealed', async () => {
    mockFlowState({ state: 'revealed', password: 'super-secret' })

    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy password/i })).toBeInTheDocument()
    })
  })

  it('shows inline error when state is awaiting-code with an error', async () => {
    mockFlowState({ state: 'awaiting-code', error: 'Invalid code. Please try again.' })

    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => {
      expect(screen.getByText('Invalid code. Please try again.')).toBeInTheDocument()
    })
  })

  it('calls submitCode when code form is submitted', async () => {
    mockFlowState({ state: 'awaiting-code' })

    render(
      <OtpModal credentialId={1} purpose="GitHub">
        <button>Reveal</button>
      </OtpModal>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => screen.getByLabelText(/authenticator code/i))

    fireEvent.change(screen.getByLabelText(/authenticator code/i), {
      target: { value: '123456' },
    })
    fireEvent.submit(screen.getByRole('button', { name: /verify/i }).closest('form')!)

    expect(mockSubmitCode).toHaveBeenCalledWith('123456')
  })
})
