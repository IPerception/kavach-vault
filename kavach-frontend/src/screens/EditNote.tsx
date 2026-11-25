import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { listCredentials, updateCredential } from '../api/credentials'
import { ItemDialog, ItemDialogFooter, useItemDialogClose } from '../components/ItemDialog'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { DeleteItemDialog } from '../components/DeleteItemDialog'
import { Textarea } from '../components/ui/Textarea'
import { TagInput } from '../components/TagInput'

const schema = z.object({
  body: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function EditNote() {
  const { id } = useParams<{ id: string }>()
  const close = useItemDialogClose()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])

  const { data: credentials = [], isLoading } = useQuery({
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
      close()
    },
  })

  if (!credential) {
    return (
      <ItemDialog title="Edit item">
        <p className="text-sm text-soft">{isLoading ? 'Loading...' : 'Note not found.'}</p>
      </ItemDialog>
    )
  }

  return (
    <ItemDialog
      title="Edit item"
      actions={<DeleteItemDialog id={credential.id} name={credential.purpose} kind="note" />}
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          id="title"
          label="Title"
          value={credential.purpose}
          readOnly
          className="cursor-not-allowed opacity-50"
        />
        <Textarea
          id="body"
          label="New note body (leave blank to keep existing)"
          rows={6}
          placeholder="Type new content to replace the existing note..."
          {...register('body')}
        />
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-weak-text">Failed to update note.</p>
        )}
        <ItemDialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save changes
          </Button>
        </ItemDialogFooter>
      </form>
    </ItemDialog>
  )
}
