import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createNote } from '../api/credentials'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
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
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-kavach-500">Add secure note</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          id="title"
          label="Title"
          placeholder="e.g. Wi-Fi credentials"
          error={errors.title?.message}
          {...register('title')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="body" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Note
          </label>
          <textarea
            id="body"
            rows={6}
            placeholder="Enter your secure note here..."
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-kavach-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            {...register('body')}
          />
          {errors.body && (
            <p className="text-xs text-red-400">{errors.body.message}</p>
          )}
        </div>
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-red-400">
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
  )
}
