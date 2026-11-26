import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'
import { BrandHero } from '../components/BrandHero'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function LockScreen() {
  const navigate = useNavigate()
  const { unlock } = useKavachStore()
  const storedUsername = localStorage.getItem('kavach_username') ?? ''

  const schema = z.object({
    username: storedUsername ? z.string().optional() : z.string().min(1, 'Required'),
    masterPassword: z.string().min(1, 'Required'),
  })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const username = storedUsername || (data.username ?? '')
      return login({ username, password: data.masterPassword })
    },
    onSuccess: (_result, data) => {
      // Remember who unlocked, so the next lock screen greets them and skips the username
      // field. Setup stores it too, but localStorage is per origin (dev :5173 vs :8080).
      if (!storedUsername && data.username) localStorage.setItem('kavach_username', data.username)
      unlock()
      navigate('/dashboard')
    },
    onError: () => {
      setError('masterPassword', { message: 'Incorrect password' })
    },
  })

  return (
    <BrandHero>
      <div className="rule-gold mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-text">Unlock vault</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-chip-border bg-chip px-2.5 py-0.5 font-mono text-2xs text-soft">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-fair-bar" />
          locked
        </span>
      </div>

      <p className="mb-4 text-sm text-soft">
        {storedUsername ? (
          <>
            Welcome back, <span className="font-medium text-text">{storedUsername}</span>.{' '}
          </>
        ) : null}
        Kavach locks itself after 10 minutes idle.
      </p>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        {!storedUsername && (
          <Input
            id="username"
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
        )}
        <Input
          id="masterPassword"
          label="Master password"
          type="password"
          mono
          autoComplete="current-password"
          autoFocus
          error={errors.masterPassword?.message}
          {...register('masterPassword')}
        />
        <Button type="submit" className="w-full" kbd="Enter" aria-label="Unlock" loading={mutation.isPending}>
          Unlock
        </Button>
        <p className="text-center text-xs text-muted">5 failed attempts lock unlocking for 15 minutes.</p>
      </form>
    </BrandHero>
  )
}
