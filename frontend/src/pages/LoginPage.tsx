import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { IconLogout } from '../components/ui/Icons'
import { ApiError } from '../services/api'
import { RedirectIfAuthenticated, useRouteFocus } from '../components/Guards'
import { useAuth } from '../services/auth'

export default function LoginPage() {
  useRouteFocus()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({})
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from =
    (location.state as { from?: string } | null)?.from ?? '/admin'

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return
    setMessage(null)

    const nextErrors: { username?: string; password?: string } = {}
    if (!username.trim()) nextErrors.username = 'Please enter your username.'
    if (!password) nextErrors.password = 'Please enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message)
        if (error.isNetwork) {
          setErrors({})
        }
      } else {
        setMessage('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <RedirectIfAuthenticated>
      <div className="festive-pattern flex min-h-dvh flex-col justify-center bg-maroon-900 px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <Brand inverted />
            <p className="mt-4 text-sm font-medium text-gold-200">
              Volunteer sign in
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Admin Dashboard</h1>
          </div>

          <form
            onSubmit={(event) => void onSubmit(event)}
            className="rounded-2xl bg-white p-5 shadow-card-hover sm:p-6"
            noValidate
          >
            {message ? (
              <Alert tone="danger" className="mb-4">
                {message}
              </Alert>
            ) : null}

            <div className="flex flex-col gap-4">
              <Field label="Username" htmlFor="username" required error={errors.username}>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  error={errors.username}
                  disabled={loading}
                />
              </Field>

              <Field label="Password" htmlFor="password" required error={errors.password}>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                  disabled={loading}
                />
              </Field>

              <Button type="submit" size="lg" fullWidth loading={loading}>
                Sign in
              </Button>
            </div>
          </form>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/60">
            <IconLogout className="h-3.5 w-3.5" />
            Sessions expire after inactivity for your security.
          </p>
        </div>
      </div>
    </RedirectIfAuthenticated>
  )
}
