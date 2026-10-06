import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { Badge } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Alert } from '../components/ui/Alert'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Textarea } from '../components/ui/Form'
import {
  IconChevronRight,
  IconEdit,
  IconGroups,
  IconPlus,
  IconSortDown,
  IconSortUp,
  IconTrash,
} from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import type { AgeGroup } from '../types'
import { useToast } from '../hooks/useToast'
import { PRIZE_EMOJI } from '../utils/format'
import { cn } from '../utils/cn'

interface FormState {
  name: string
  description: string
  is_active: boolean
}

const emptyForm: FormState = { name: '', description: '', is_active: true }

export default function AgeGroupsPage() {
  const toast = useToast()
  const [groups, setGroups] = useState<AgeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AgeGroup | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleting, setDeleting] = useState<AgeGroup | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.ageGroups.list()
      setGroups(data.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load age groups.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFieldErrors({})
    setModalOpen(true)
  }

  const openEdit = (group: AgeGroup) => {
    setEditing(group)
    setForm({
      name: group.name,
      description: group.description ?? '',
      is_active: group.is_active,
    })
    setFieldErrors({})
    setModalOpen(true)
  }

  const submitForm = async () => {
    if (saving) return

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Please enter an age group name.' })
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      if (editing) {
        const updated = await api.ageGroups.update(editing.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          is_active: form.is_active,
        })
        setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)))
        toast.success('Age group updated')
      } else {
        const created = await api.ageGroups.create({
          name: form.name.trim(),
          description: form.description.trim(),
          is_active: form.is_active,
        })
        setGroups((current) => [...current, created])
        toast.success('Age group created', { description: created.name })
      }
      setModalOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(err.fieldErrors)
      } else if (err instanceof ApiError) {
        toast.error(err.message)
      } else {
        toast.error('Something went wrong')
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (group: AgeGroup) => {
    if (busyId !== null) return
    setBusyId(group.id)
    try {
      const updated = await api.ageGroups.update(group.id, { is_active: !group.is_active })
      setGroups((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success(updated.is_active ? `${group.name} enabled` : `${group.name} disabled`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update age group')
    } finally {
      setBusyId(null)
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= groups.length || busyId !== null) return

    const next = [...groups]
    const a = next[index]
    const b = next[target]
    if (!a || !b) return
    next[index] = b
    next[target] = a

    const previous = groups
    setGroups(next)
    setBusyId(a.id)
    try {
      const data = await api.ageGroups.reorder(next.map((group) => group.id))
      setGroups(data.items)
    } catch (err) {
      setGroups(previous)
      toast.error(err instanceof ApiError ? err.message : 'Could not save the new order')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting || deleteLoading) return
    setDeleteLoading(true)
    try {
      await api.ageGroups.remove(deleting.id)
      setGroups((current) => current.filter((group) => group.id !== deleting.id))
      toast.success('Age group deleted')
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete age group')
      setDeleting(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Age Groups"
        subtitle="Each group contains 1st, 2nd and 3rd prize sections."
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={openCreate}>
            New Age Group
          </Button>
        }
      />

      {error ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card p-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-4 w-40" />
              <Skeleton className="mt-4 h-4 w-full" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<IconGroups className="h-6 w-6" />}
          title="No age groups yet"
          description="Create your first age group — for example Kids, Teenagers or Adults."
          action={<Button fullWidth onClick={openCreate}>Create Age Group</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {groups.map((group, index) => (
            <li key={group.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/admin/age-groups/${group.id}`}
                      className="focus-ring rounded-lg text-base font-bold uppercase tracking-wide text-maroon-800 hover:text-maroon-600"
                    >
                      {group.name}
                    </Link>
                    {group.is_active ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="gray">Disabled</Badge>
                    )}
                  </div>
                  {group.description ? (
                    <p className="mt-0.5 text-sm text-charcoal-500">{group.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-charcoal-600">
                    <span>
                      {PRIZE_EMOJI[1]} <b>{group.counts['1']}</b> 1st
                    </span>
                    <span>
                      {PRIZE_EMOJI[2]} <b>{group.counts['2']}</b> 2nd
                    </span>
                    <span>
                      {PRIZE_EMOJI[3]} <b>{group.counts['3']}</b> 3rd
                    </span>
                    <span className="font-semibold text-charcoal-800">
                      Total {group.total}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconButton
                    label={`Move ${group.name} up`}
                    disabled={index === 0 || busyId !== null}
                    onClick={() => void move(index, -1)}
                  >
                    <IconSortUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${group.name} down`}
                    disabled={index === groups.length - 1 || busyId !== null}
                    onClick={() => void move(index, 1)}
                  >
                    <IconSortDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`${group.is_active ? 'Disable' : 'Enable'} ${group.name}`}
                    disabled={busyId === group.id}
                    onClick={() => void toggleActive(group)}
                  >
                    <span className="text-xs font-bold">{group.is_active ? 'ON' : 'OFF'}</span>
                  </IconButton>
                  <IconButton label={`Edit ${group.name}`} onClick={() => openEdit(group)}>
                    <IconEdit className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    label={`Delete ${group.name}`}
                    onClick={() => setDeleting(group)}
                    danger
                  >
                    <IconTrash className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>

              <Link
                to={`/admin/age-groups/${group.id}`}
                className="focus-ring mt-3 flex min-h-10 items-center justify-between rounded-xl border border-cream-200 bg-cream-100/70 px-3 text-sm font-semibold text-charcoal-700 hover:bg-cream-100"
              >
                Open prize sections
                <IconChevronRight className="h-4 w-4 text-charcoal-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Age Group' : 'New Age Group'}
        description={
          editing
            ? 'Update the group details. Participants stay in their prize sections.'
            : 'The group automatically gets 1st, 2nd and 3rd prize sections.'
        }
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving} fullWidth>
              Cancel
            </Button>
            <Button onClick={() => void submitForm()} loading={saving} fullWidth>
              {editing ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
          className="flex flex-col gap-4 pb-2"
        >
          <Field label="Name" htmlFor="group-name" required error={fieldErrors.name}>
            <Input
              id="group-name"
              value={form.name}
              maxLength={60}
              placeholder="e.g. Kids"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              error={fieldErrors.name}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="group-description"
            hint="Optional — e.g. age range"
            error={fieldErrors.description}
          >
            <Textarea
              id="group-description"
              value={form.description}
              maxLength={255}
              placeholder="Ages 5 - 10"
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              error={fieldErrors.description}
            />
          </Field>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-100/60 px-4 py-3">
            <span className="text-sm font-semibold text-charcoal-800">
              Accepting registrations
              <span className="block text-xs font-normal text-charcoal-500">
                Disabled groups cannot receive new participants.
              </span>
            </span>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
              className="h-5 w-5 accent-[#87132A]"
            />
          </label>
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete age group?"
        destructive
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        message={
          <>
            <p className="font-semibold text-charcoal-800">{deleting?.name}</p>
            <p className="mt-1">
              This removes the group only if it has no participants. This action cannot be undone.
            </p>
            {deleting && deleting.total > 0 ? (
              <Alert tone="warning" className="mt-3">
                {deleting.total} participant(s) are registered in this group, so it cannot be
                deleted right now.
              </Alert>
            ) : null}
          </>
        }
      />
    </div>
  )
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
  danger = false,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'focus-ring flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'border-red-100 text-red-600 hover:bg-red-50'
          : 'border-cream-300 text-charcoal-600 hover:bg-cream-100'
      )}
    >
      {children}
    </button>
  )
}
