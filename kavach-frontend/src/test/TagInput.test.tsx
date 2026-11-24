import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { TagInput } from '../components/TagInput'

function setup(initial: string[] = []) {
  const onChange = vi.fn()
  function Harness() {
    const [tags, setTags] = useState(initial)
    return (
      <TagInput
        value={tags}
        onChange={(t) => {
          onChange(t)
          setTags(t)
        }}
      />
    )
  }
  render(<Harness />)
  return onChange
}

describe('TagInput', () => {
  it('adds a lower-cased tag on Enter', async () => {
    const onChange = setup()
    await userEvent.type(screen.getByLabelText('Tags (optional)'), 'Work{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['work'])
    expect(screen.getByRole('button', { name: 'Remove tag work' })).toBeInTheDocument()
  })

  it('adds a tag on comma', async () => {
    const onChange = setup()
    await userEvent.type(screen.getByLabelText('Tags (optional)'), 'bank,')
    expect(onChange).toHaveBeenLastCalledWith(['bank'])
  })

  it('ignores duplicates', async () => {
    const onChange = setup(['work'])
    await userEvent.type(screen.getByLabelText('Tags (optional)'), 'work{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a tag by its labelled button', async () => {
    const onChange = setup(['work', 'bank'])
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag work' }))
    expect(onChange).toHaveBeenLastCalledWith(['bank'])
    expect(screen.queryByRole('button', { name: 'Remove tag work' })).not.toBeInTheDocument()
  })
})
