import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { listCredentials, updateCredential } from '../api/credentials'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { TagInput } from '../components/TagInput'

const schema = z.object({
  body: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function EditNote() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])

  const { data: credentials = [] } = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
  })

  const credential = credentials.find((c) => c.id === Number(id))

  useEffect(() => {
    if (credential) {
      setTags(credential.tags ?? [])
    }
  }, [credential])

  const { register, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      updateCredential(Number(id), {
        password: data.body || undefined,
        tags,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] })
      navigate('/dashboard')
    },
  })

  if (!credential) {
    return <p className="text-sm text-zinc-400">Note not found.</p>
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-kavach-500">Edit secure note</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          id="title"
          label="Title"
          value={credential.purpose}
          readOnly
          className="cursor-not-allowed opacity-50"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="body" className="text-sm font-medium text-zinc-300">
            New note body (leave blank to keep existing)
          </label>
          <textarea
            id="body"
            rows={6}
            placeholder="Type new content to replace the existing note..."
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-kavach-500"
            {...register('body')}
          />
        </div>
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-red-400">Failed to update note.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  )
}
