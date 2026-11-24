import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createCredential } from '../api/credentials'
import { Card } from '../components/ui/Card'
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
  const navigate = useNavigate()
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
      navigate('/dashboard')
    },
  })

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold text-text">New item</h1>
        <ItemTypeSwitch current="password" />
      </div>
      <Card className="mx-auto max-w-lg">

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
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
        <Textarea id="notes" label="Notes (optional)" rows={3} {...register('notes')} />
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-weak-text">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
              'Failed to save credential.'}
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
