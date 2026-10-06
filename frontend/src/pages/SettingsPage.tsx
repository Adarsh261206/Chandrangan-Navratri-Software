import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Form'
import { IconCalendar, IconCheck, IconLogout, IconSettings } from '../components/ui/Icons'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useAuth } from '../services/auth'
import { useToast } from '../hooks/useToast'
import type { EventDay } from '../types'

const MIN_PASSWORD_LENGTH = 8

export default function SettingsPage() {
  const { user, logout, isSuperAdmin } = useAuth()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [eventDays, setEventDays] = useState<EventDay[]>([])
  const [dayDates, setDayDates] = useState<Record<number, string>>({})
  const [daysLoading, setDaysLoading] = useState(true)
  const [daysError, setDaysError] = useState<string | null>(null)
  const [savingDays, setSavingDays] = useState(false)
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

  useEffect(() => {
    if (!isSuperAdmin) return
    let cancelled = false
    api.eventDays
      .list()
      .then((payload) => {
        if (cancelled) return
        setEventDays(payload.days)
        setDayDates(Object.fromEntries(payload.days.map((day) => [day.id, day.date])))
      })
      .catch((err) => {
        if (!cancelled) {
          setDaysError(err instanceof ApiError ? err.message : 'Could not load event days.')
        }
      })
      .finally(() => {
        if (!cancelled) setDaysLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  const saveDays = async () => {
    if (savingDays) return
    setDaysError(null)
    const missing = eventDays.filter((day) => !dayDates[day.id])
    if (missing.length > 0) {
      setDaysError(`Add a date for every day (missing: ${missing.map((d) => d.label).join(', ')}).`)
      return
    }
    setSavingDays(true)
    try {
      const payload = await api.eventDays.updateDates(
        Object.fromEntries(eventDays.map((day) => [day.id, dayDates[day.id]]))
      )
      setEventDays(payload.days)
      toast.success('Event days saved', {
        description: payload.days.map((day) => `${day.label}: ${day.date}`).join(' · '),
      })
    } catch (err) {
      setDaysError(err instanceof ApiError ? err.message : 'Could not save event days.')
    } finally {
      setSavingDays(false)
    }
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

      {isSuperAdmin ? (
        <section className="card mt-4 p-5" aria-labelledby="event-days-heading">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maroon-50 text-maroon-700">
              <IconCalendar className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="event-days-heading" className="text-base font-semibold text-charcoal-900">
                Event Days (Navratri)
              </h2>
              <p className="text-sm text-charcoal-500">
                Edit the date for each of the 9 days. Every day has its own prize sections.
              </p>
            </div>
          </div>

          {daysError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">
              {daysError}
            </div>
          ) : null}

          {daysLoading ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {eventDays.map((day) => (
                  <Field
                    key={day.id}
                    label={day.label}
                    htmlFor={`event-day-${day.id}`}
                    hint={day.weekday}
                    className="mb-0"
                  >
                    <Input
                      id={`event-day-${day.id}`}
                      type="date"
                      value={dayDates[day.id] ?? ''}
                      disabled={savingDays}
                      onChange={(event) =>
                        setDayDates((current) => ({
                          ...current,
                          [day.id]: event.target.value,
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  loading={savingDays}
                  icon={<IconCheck className="h-4 w-4" />}
                  onClick={() => void saveDays()}
                >
                  Save Event Days
                </Button>
                <p className="text-xs text-charcoal-500">
                  Dates must be unique. Participants are always recorded against a day.
                </p>
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
