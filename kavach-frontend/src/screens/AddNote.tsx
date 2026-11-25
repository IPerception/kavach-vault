import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createNote } from '../api/credentials'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { ItemTypeSwitch } from '../components/ItemTypeSwitch'
import { TagInput } from '../components/TagInput'

const schema = z.object({
  title: z.string().min(1, 'Required'),
  body: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

export function AddNote() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      createNote({
        title: data.title,
        body: data.body,
        tags: tags.length > 0 ? tags : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] })
      navigate('/dashboard')
    },
  })

  return (
    <div className="space-y-6">
      <div className="rule-gold mx-auto flex max-w-lg items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold text-text">New item</h1>
        <ItemTypeSwitch current="note" />
      </div>
      <Card className="mx-auto max-w-lg">

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          id="title"
          label="Title"
          placeholder="e.g. Wi-Fi credentials"
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          id="body"
          label="Note"
          rows={6}
          placeholder="Enter your secure note here..."
          error={errors.body?.message}
          {...register('body')}
        />
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-weak-text">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
              'Failed to save note.'}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
    </div>
  )
}
