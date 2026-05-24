import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { login } from '../api/auth'
import { useKavachStore } from '../store/useKavachStore'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
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
    onSuccess: () => {
      unlock()
      navigate('/dashboard')
    },
    onError: () => {
      setError('masterPassword', { message: 'Incorrect password' })
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-3xl overflow-hidden !p-0">
        <div className="flex h-[360px]">
          {/* Left column - logo panel */}
          <div className="relative w-2/4 bg-zinc-800">
            <img
              src="/Kavach-Logo.png"
              alt="Kavach"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right column - form */}
          <div className="flex flex-1 flex-col justify-center overflow-y-auto p-8">
            <CardHeader>
              <div className="mb-2 flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-zinc-500" />
                <CardTitle className="text-center font-bold underline text-kavach-500">Vault locked</CardTitle>
              </div>
              {storedUsername && (
                <p className="text-center text-sm text-zinc-400">
                  Welcome back, <span className="font-medium text-zinc-200">{storedUsername}</span>
                </p>
              )}
            </CardHeader>

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
                autoComplete="current-password"
                autoFocus
                error={errors.masterPassword?.message}
                {...register('masterPassword')}
              />
              <Button type="submit" className="w-full" loading={mutation.isPending}>
                Unlock
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  )
}
