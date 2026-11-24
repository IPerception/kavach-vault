import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { deleteCredential } from '../api/credentials'
import { Button } from './ui/Button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/Dialog'

interface DeleteItemDialogProps {
  id: number
  name: string
  kind: 'credential' | 'note'
}

/** Danger action for the Edit screens: confirm, delete, refresh the vault queries, go to the dashboard. */
export function DeleteItemDialog({ id, name, kind }: DeleteItemDialogProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => deleteCredential(id),
    onSuccess: () => {
      // ['credentials'] also covers ['credentials', 'health'].
      qc.invalidateQueries({ queryKey: ['credentials'] })
      navigate('/dashboard')
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="danger">
          <Trash2 size={14} aria-hidden="true" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-base font-semibold text-text">Delete {kind}?</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-soft">{name}</DialogDescription>
        <p className="mt-3 text-sm text-soft">
          {kind === 'note'
            ? 'This will permanently remove the note and its contents. This cannot be undone.'
            : 'This will permanently remove the credential and its password. This cannot be undone.'}
        </p>
        {mutation.isError && <p className="mt-3 text-xs text-weak-text">Failed to delete {kind}.</p>}
        <div className="mt-5 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button variant="danger" size="sm" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
