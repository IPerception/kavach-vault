import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCredential } from '../api/credentials'
import { ItemDialog, ItemDialogFooter, useItemDialogClose } from '../components/ItemDialog'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { ItemTypeSwitch } from '../components/ItemTypeSwitch'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import { PasswordGenerator } from '../components/PasswordGenerator'
import { TagInput } from '../components/TagInput'

const schema = z.object({
  purpose: z.string().min(1, 'Required'),
  username: z.string().optional(),
  password: z.string().min(1, 'Required'),
  url: z.union([z.string().url('Enter the full URL including https://'), z.literal('')]).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function AddCredential() {
  const close = useItemDialogClose()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const password = watch('password', '')

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      createCredential({
        purpose: data.purpose,
        username: data.username,
        password: data.password,
        url: data.url || undefined,
        notes: data.notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] })
      close()
    },
  })

  return (
    <ItemDialog title="New item" actions={<ItemTypeSwitch current="password" />}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
        <Input
          id="purpose"
          label="Purpose"
          placeholder="e.g. GitHub"
          error={errors.purpose?.message}
          {...register('purpose')}
        />
        <Input
          id="username"
          label="Username / email (optional)"
          autoComplete="username"
          error={errors.username?.message}
          {...register('username')}
        />
        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrengthMeter password={password} />
        </div>
        <PasswordGenerator onGenerated={(pw) => setValue('password', pw, { shouldValidate: true })} />
        <Input
          id="url"
          label="URL (optional)"
          type="text"
          placeholder="https://example.com"
          error={errors.url?.message}
          {...register('url')}
        />
        <Textarea id="notes" label="Notes (optional)" rows={2} {...register('notes')} />
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-weak-text">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
              'Failed to save credential.'}
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
