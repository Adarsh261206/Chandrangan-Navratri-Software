import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { IconCheck, IconLogout, IconSettings } from '../components/ui/Icons'
import { api, ApiError } from '../services/api'
import { useAuth } from '../services/auth'
import { useToast } from '../hooks/useToast'

const MIN_PASSWORD_LENGTH = 8

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!currentPassword) next.current_password = 'Enter your current password.'
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.new_password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (confirmPassword !== newPassword) next.confirm_password = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!validate()) return
    setSaving(true)
    try {
      await api.auth.changePassword(currentPassword, newPassword)
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message)
        if (err.fieldErrors) setErrors(err.fieldErrors)
      } else {
        setFormError('Could not update your password. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your admin account." />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon-50 text-maroon-700">
              <IconSettings className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-charcoal-900">Account</h2>
              <p className="text-sm text-charcoal-500">Signed in as {user?.username}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-cream-200 pt-4">
            <Button
              variant="secondary"
              fullWidth
              icon={<IconLogout className="h-4 w-4" />}
              onClick={() => {
                setSigningOut(true)
                void logout().finally(() => setSigningOut(false))
              }}
              loading={signingOut}
              disabled={signingOut}
            >
              Sign Out
            </Button>
          </div>

          <dl className="mt-4 flex flex-col gap-2 border-t border-cream-200 pt-4 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-charcoal-500">Username</dt>
              <dd className="font-semibold text-charcoal-900">{user?.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-charcoal-500">Role</dt>
              <dd className="font-semibold text-charcoal-900">Administrator</dd>
            </div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-base font-semibold text-charcoal-900">Change Password</h2>

          <form onSubmit={(event) => void submit(event)} noValidate className="mt-4">
            {formError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
                {formError}
              </div>
            ) : null}

            <Field label="Current Password" htmlFor="current-password" error={errors.current_password}>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                error={errors.current_password}
                required
              />
            </Field>

            <Field
              label="New Password"
              htmlFor="new-password"
              error={errors.new_password}
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                error={errors.new_password}
                required
              />
            </Field>

            <Field label="Confirm New Password" htmlFor="confirm-password" error={errors.confirm_password}>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={errors.confirm_password}
                required
              />
            </Field>

            <Button
              type="submit"
              loading={saving}
              fullWidth
              icon={<IconCheck className="h-4 w-4" />}
              className="mt-2"
            >
              Update Password
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
