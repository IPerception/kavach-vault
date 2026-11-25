import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNote } from '../api/credentials'
import { ItemDialog, ItemDialogFooter, useItemDialogClose } from '../components/ItemDialog'
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
  const close = useItemDialogClose()
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
      close()
    },
  })

  return (
    <ItemDialog title="New item" actions={<ItemTypeSwitch current="note" />}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
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
        <ItemDialogFooter>
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save
          </Button>
        </ItemDialogFooter>
      </form>
    </ItemDialog>
  )
}
