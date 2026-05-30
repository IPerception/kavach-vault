import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { RefreshCw } from 'lucide-react'
import { listCredentials, updateCredential } from '../api/credentials'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter'
import { PasswordGenerator } from '../components/PasswordGenerator'
import { TagInput } from '../components/TagInput'

const schema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  url: z.union([z.string().url('Enter the full URL including https://'), z.literal('')]).optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function EditCredential() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])
  const [pendingPassword, setPendingPassword] = useState<string | null>(null)

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: credential
      ? {
          username: credential.username ?? '',
          password: '',
          url: credential.url ?? '',
          notes: credential.notes ?? '',
        }
      : undefined,
  })

  const password = watch('password', '')

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      updateCredential(Number(id), {
        username: data.username,
        password: data.password || undefined,
        url: data.url || undefined,
        notes: data.notes || undefined,
        tags,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credentials'] })
      navigate('/dashboard')
    },
  })

  if (!credential) {
    return <p className="text-sm text-zinc-400">Credential not found.</p>
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="text-kavach-500">Edit credential</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input
          id="purpose"
          label="Purpose"
          value={credential.purpose}
          readOnly
          className="cursor-not-allowed opacity-50"
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
            label="New password (leave blank to keep existing)"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {password && <PasswordStrengthMeter password={password} />}
        </div>
        <PasswordGenerator onGenerated={(pw) => setPendingPassword(pw)} />

        <Dialog.Root open={pendingPassword !== null} onOpenChange={(open) => { if (!open) setPendingPassword(null) }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kavach-500/10">
                  <RefreshCw className="h-5 w-5 text-kavach-500" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Replace password?
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-zinc-600 dark:text-zinc-400">
                    {credential.purpose}
                  </Dialog.Description>
                </div>
              </div>
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                The generated password will replace the current password field:
              </p>
              <p className="mb-5 break-all rounded bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {pendingPassword}
              </p>
              <div className="flex justify-end gap-3">
                <Dialog.Close asChild>
                  <Button variant="ghost" size="sm">Cancel</Button>
                </Dialog.Close>
                <Button
                  size="sm"
                  onClick={() => {
                    setValue('password', pendingPassword ?? '', { shouldValidate: true })
                    setPendingPassword(null)
                  }}
                >
                  Replace
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <Input
          id="url"
          label="URL (optional)"
          type="text"
          placeholder="https://example.com"
          error={errors.url?.message}
          {...register('url')}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-kavach-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            {...register('notes')}
          />
        </div>
        <TagInput value={tags} onChange={setTags} />
        {mutation.isError && (
          <p className="text-xs text-red-400">Failed to update credential.</p>
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
