import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { listCredentials, updateCredential } from '../api/credentials'
import { ItemDialog, ItemDialogFooter, useItemDialogClose } from '../components/ItemDialog'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { DeleteItemDialog } from '../components/DeleteItemDialog'
import { Textarea } from '../components/ui/Textarea'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../components/ui/Dialog'
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
  const close = useItemDialogClose()
  const qc = useQueryClient()
  const [tags, setTags] = useState<string[]>([])
  const [pendingPassword, setPendingPassword] = useState<string | null>(null)

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
      close()
    },
  })

  if (!credential) {
    return (
      <ItemDialog title="Edit item">
        <p className="text-sm text-soft">{isLoading ? 'Loading...' : 'Credential not found.'}</p>
      </ItemDialog>
    )
  }

  return (
    <ItemDialog
      title="Edit item"
      actions={<DeleteItemDialog id={credential.id} name={credential.purpose} kind="credential" />}
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-3">
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

        <Dialog open={pendingPassword !== null} onOpenChange={(open) => { if (!open) setPendingPassword(null) }}>
          <DialogContent className="max-w-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15">
                <RefreshCw className="h-5 w-5 text-accent-text" aria-hidden="true" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-text">Replace password?</DialogTitle>
                <DialogDescription className="text-sm text-soft">{credential.purpose}</DialogDescription>
              </div>
            </div>
            <p className="mb-3 text-sm text-soft">
              The generated password will replace the current password field:
            </p>
            <p className="mb-5 break-all rounded-control bg-chip px-3 py-2 font-mono text-xs text-text">
              {pendingPassword}
            </p>
            <div className="flex justify-end gap-3">
              <DialogClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DialogClose>
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
          </DialogContent>
        </Dialog>
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
          <p className="text-xs text-weak-text">Failed to update credential.</p>
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
