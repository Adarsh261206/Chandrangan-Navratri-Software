import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { PhotoCapture } from '../components/PhotoCapture'
import { DuplicateDialog } from '../components/DuplicateDialog'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Form'
import { IconGroups, IconPlus } from '../components/ui/Icons'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../services/auth'
import { useDayParam } from '../hooks/useDayParam'
import type { AgeGroup, DuplicateLevel, DuplicateMatch, EventDay, PrizePosition } from '../types'
import { cn } from '../utils/cn'
import { pickPrimaryMatch } from '../utils/duplicates'
import { PRIZE_EMOJI, PRIZE_LABELS } from '../utils/format'
import type { CompressedImage } from '../utils/image'

const DRAFT_KEY = 'navratrotsav:draft:participant'

interface Draft {
  name: string
  prize: PrizePosition
  groupId: number
  dayId?: number
}

function makeRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export default function AddParticipantPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [days, setDays] = useState<EventDay[]>([])
  const [todayId, setTodayId] = useState<number | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [groupsError, setGroupsError] = useState<string | null>(null)

  const [groupId, setGroupId] = useState<number | null>(null)
  // ?day=N → last used day → today → Day 1 (same rule as every other page).
  const [dayId, setDayId] = useDayParam(days, todayId)
  const [prize, setPrize] = useState<PrizePosition>(1)
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [liveDuplicate, setLiveDuplicate] = useState<DuplicateMatch[] | null>(null)
  const [duplicateLevel, setDuplicateLevel] = useState<Exclude<DuplicateLevel, 'none'> | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saved, setSaved] = useState<{ code: string; name: string; dayId: number } | null>(null)
  const { isSuperAdmin } = useAuth()

  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef<string>(makeRequestId())
  const draftRestored = useRef(false)

  const selectedGroup = useMemo(
    () => ageGroups.find((group) => group.id === groupId) ?? null,
    [ageGroups, groupId]
  )

  /* ---------------------------------------------------------------
   * Load age groups + restore any in-progress draft
   * ------------------------------------------------------------- */
  const loadGroups = useCallback(async () => {
    setLoadingGroups(true)
    setGroupsError(null)
    try {
      const [data, dayList] = await Promise.all([
        api.ageGroups.list(),
        api.eventDays.list(),
      ])
      setAgeGroups(data.items)
      setDays(dayList.days)
      setTodayId(dayList.today_id)

      const queryGroup = Number(searchParams.get('group'))
      const queryPrize = Number(searchParams.get('prize'))

      if (Number.isFinite(queryGroup) && queryGroup > 0) {
        setGroupId(queryGroup)
      } else if (!draftRestored.current) {
        const firstActive = data.items.find((group) => group.is_active)
        if (data.items.length === 1 && firstActive) setGroupId(firstActive.id)
      }

      if (queryPrize === 1 || queryPrize === 2 || queryPrize === 3) {
        setPrize(queryPrize)
      }
    } catch (error) {
      setGroupsError(error instanceof ApiError ? error.message : 'Could not load age groups.')
    } finally {
      setLoadingGroups(false)
    }
  }, [searchParams])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (draftRestored.current) return
    draftRestored.current = true
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<Draft>
      if (typeof draft.name === 'string' && draft.name.trim()) setName(draft.name)
      if (draft.prize === 1 || draft.prize === 2 || draft.prize === 3) setPrize(draft.prize)
      if (typeof draft.groupId === 'number') {
        setGroupId((current) => current ?? draft.groupId ?? null)
      }
    } catch {
      // Ignore corrupt drafts.
    }
  }, [])

  useEffect(() => {
    if (groupId === null) return
    const draft: Draft = { name, prize, groupId, dayId }
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Storage may be unavailable (private mode) — the form still works.
    }
  }, [name, prize, groupId, dayId])

  /* ---------------------------------------------------------------
   * Live duplicate check (debounced, server-side)
   * ------------------------------------------------------------- */
  useEffect(() => {
    const trimmed = name.trim()
    if (trimmed.length < 2 || groupId === null) {
      setLiveDuplicate(null)
      setDuplicateLevel(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.participants
        .checkDuplicate(trimmed, groupId, prize, dayId, controller.signal)
        .then((result) => {
          setLiveDuplicate(result.matches)
          setDuplicateLevel(result.level === 'none' ? null : result.level)
        })
        .catch(() => {
          // Silent: the authoritative check runs on save.
        })
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [name, groupId, prize, dayId])

  /* ---------------------------------------------------------------
   * Save
   * ------------------------------------------------------------- */
  const submit = useCallback(
    async (force: boolean) => {
      const trimmed = name.trim()

      let hasError = false
      if (trimmed.length < 2) {
        setNameError('Please enter the participant name.')
        hasError = true
      } else {
        setNameError(null)
      }
      if (groupId === null) {
        toast.error('Please select an age group')
        hasError = true
      }
      if (hasError) return

      const group = ageGroups.find((item) => item.id === groupId)
      if (!group) return

      setSaving(true)
      const formData = new FormData()
      formData.append('name', trimmed)
      formData.append('age_group_id', String(groupId))
      formData.append('prize_position', String(prize))
      formData.append('day_id', String(dayId))
      formData.append('request_id', requestIdRef.current)
      if (force) formData.append('force', '1')
      if (photo) formData.append('photo', photo.blob, photo.filename)

      try {
        const result = await api.participants.create(formData)
        setSaved({
          code: result.participant.participant_code,
          name: trimmed,
          dayId,
        })
        setDialogOpen(false)
        setDuplicateLevel(null)
        setLiveDuplicate(null)
        setName('')
        setPhoto(null)
        setPhotoError(null)
        setNameError(null)
        requestIdRef.current = makeRequestId()
        try {
          window.sessionStorage.removeItem(DRAFT_KEY)
        } catch {
          // Ignore.
        }
        toast.success('Participant added', {
          description: `${trimmed} • ${days.find((day) => day.id === dayId)?.label ?? `Day ${dayId}`} • ${group.name} • ${PRIZE_LABELS[prize]}`,
        })
        window.setTimeout(() => nameInputRef.current?.focus(), 60)
      } catch (error) {
        if (error instanceof ApiError) {
          const level = error.duplicateLevel as Exclude<DuplicateLevel, 'none'> | null
          if (level) {
            const payload = error.payload as { matches?: DuplicateMatch[] } | null
            setLiveDuplicate(payload?.matches ?? [])
            setDuplicateLevel(level)
            setDialogOpen(true)
          } else if (error.isNetwork) {
            toast.error('Connection lost — your entry was not saved', {
              description: 'Your details are kept. Please retry when you are back online.',
              duration: 6000,
              action: { label: 'Retry', onClick: () => void submit(force) },
            })
          } else if (error.isValidation) {
            if (error.fieldErrors.photo) setPhotoError(error.fieldErrors.photo)
            if (error.fieldErrors.name) setNameError(error.fieldErrors.name)
            const first = Object.values(error.fieldErrors)[0]
            if (first && !error.fieldErrors.photo && !error.fieldErrors.name) {
              toast.error(first)
            }
          } else {
            toast.error(error.message)
          }
        } else {
          toast.error('Something went wrong. Please try again.')
        }
      } finally {
        setSaving(false)
      }
    },
    [name, groupId, prize, dayId, photo, ageGroups, days, toast]
  )

  const backTo =
    groupId !== null
      ? `/admin/age-groups/${groupId}?day=${dayId}`
      : `/admin?day=${dayId}`

  if (groupsError) {
    return (
      <div>
        <PageHeader title="Add Participant" backTo={`/admin?day=${dayId}`} backLabel="Dashboard" />
        <LoadError message={groupsError} onRetry={() => void loadGroups()} />
      </div>
    )
  }

  if (!loadingGroups && ageGroups.length === 0) {
    return (
      <div>
        <PageHeader title="Add Participant" backTo={`/admin?day=${dayId}`} backLabel="Dashboard" />
        <EmptyState
          icon={<IconGroups className="h-6 w-6" />}
          title="No age groups available"
          description="Create an age group before registering participants."
          action={
            <Button fullWidth icon={<IconPlus className="h-4 w-4" />} onClick={() => navigate('/admin/age-groups')}>
              Manage Age Groups
            </Button>
          }
        />
      </div>
    )
  }

  const activeDuplicate = liveDuplicate ?? []
  const primaryMatch = duplicateLevel
    ? pickPrimaryMatch(duplicateLevel, activeDuplicate, { ageGroupId: groupId, prize, dayId })
    : null
  const matchSlot = (match: { day_id: number; day_label: string; age_group_name: string; prize_position: PrizePosition }) =>
    `${match.day_id !== dayId ? `${match.day_label}, ` : ''}${match.age_group_name} → ${PRIZE_LABELS[match.prize_position]}`

  const hint =
    duplicateLevel === 'exact' && primaryMatch
      ? {
          tone: 'danger' as const,
          text: `${primaryMatch.name} is already registered in ${matchSlot(primaryMatch)}. This slot cannot be taken again.`,
        }
      : duplicateLevel === 'group' && primaryMatch
        ? {
            tone: 'warning' as const,
            text: `${primaryMatch.name} is already in ${matchSlot(primaryMatch)} for this group. Please verify before saving.`,
          }
        : duplicateLevel === 'other' && primaryMatch
          ? {
              tone: 'warning' as const,
              text: `${primaryMatch.name} was previously registered in ${matchSlot(primaryMatch)}. Continue if this is a different person.`,
            }
          : null

  return (
    <div>
      <PageHeader
        title="Add Participant"
        subtitle="The section you save into decides the prize."
        backTo={backTo}
        backLabel={selectedGroup ? selectedGroup.name : 'Dashboard'}
      />

      {/* Context banner: where am I adding? */}
      <div className="festive-pattern rounded-2xl bg-maroon-800 px-4 py-4 text-white shadow-card sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold-300">
          Registering into
        </p>
        <p className="mt-1 text-lg font-extrabold leading-tight sm:text-xl">
          {loadingGroups ? (
            <span className="inline-block h-6 w-48 animate-pulse rounded bg-white/15" />
          ) : (
            <>
              {days.find((day) => day.id === dayId)?.label ?? `Day ${dayId}`}
              <span className="mx-2 text-gold-300">→</span>
              {selectedGroup?.name ?? 'Select an age group'}
              <span className="mx-2 text-gold-300">→</span>
              {PRIZE_EMOJI[prize]} {PRIZE_LABELS[prize]}
            </>
          )}
        </p>
      </div>

      {saved ? (
        <Alert
          tone="success"
          className="mt-4"
          title={`Saved · ${saved.name} (${saved.code})`}
          action={
            <span className="flex flex-col items-end gap-1">
              <Link
                to={
                  isSuperAdmin
                    ? `/admin/results?day=${saved.dayId}`
                    : `/admin?day=${saved.dayId}`
                }
                className="focus-ring whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 underline"
              >
                View Day {saved.dayId}
              </Link>
              <Link
                to="/admin/participants/new"
                onClick={() => setSaved(null)}
                className="focus-ring whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-emerald-700 underline"
              >
                Add another
              </Link>
            </span>
          }
        >
          {saved.name} is on{' '}
          <b>{days.find((day) => day.id === saved.dayId)?.label ?? `Day ${saved.dayId}`}</b> →{' '}
          {selectedGroup?.name ?? ''} → {PRIZE_EMOJI[prize]} {PRIZE_LABELS[prize]}. Ready for the
          next participant — day, group and prize are kept selected.
        </Alert>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit(false)
        }}
        className="mt-5 flex flex-col gap-6"
      >
        {/* 0 — Navratri day */}
        <section aria-labelledby="step-day">
          <h2 id="step-day" className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal-500">
            1 · Navratri Day
          </h2>
          {loadingGroups ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Field label="Event day" htmlFor="participant-day" required>
              <Select
                id="participant-day"
                value={String(dayId)}
                disabled={saving}
                onChange={(event) => {
                  setDayId(Number(event.target.value))
                  setSaved(null)
                  setLiveDuplicate(null)
                  setDuplicateLevel(null)
                }}
              >
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label} · {day.date}
                    {day.is_today ? ' (today)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </section>

        {/* 1 — Age group */}
        <section aria-labelledby="step-age-group">
          <h2 id="step-age-group" className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal-500">
            2 · Age Group
          </h2>
          {loadingGroups ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Age group">
              {ageGroups.map((group) => {
                const selected = group.id === groupId
                return (
                  <button
                    key={group.id}
                    type="button"
                    disabled={!group.is_active}
                    aria-pressed={selected}
                    onClick={() => {
                      setGroupId(group.id)
                      setSaved(null)
                    }}
                    className={cn(
                      'focus-ring min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors',
                      selected
                        ? 'border-maroon-700 bg-maroon-700 text-white shadow-card'
                        : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-100',
                      !group.is_active && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {group.name}
                    {!group.is_active ? (
                      <span className="ml-1 text-xs font-normal">(off)</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* 2 — Prize */}
        <section aria-labelledby="step-prize">
          <h2 id="step-prize" className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal-500">
            3 · Prize Section
          </h2>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Prize position">
            {([1, 2, 3] as PrizePosition[]).map((position) => {
              const selected = position === prize
              return (
                <button
                  key={position}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setPrize(position)
                    setSaved(null)
                  }}
                  className={cn(
                    'focus-ring flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-2 transition-colors',
                    selected
                      ? 'border-maroon-700 bg-maroon-50 text-maroon-800 shadow-card'
                      : 'border-cream-300 bg-white text-charcoal-600 hover:bg-cream-100'
                  )}
                >
                  <span className="text-xl leading-none">{PRIZE_EMOJI[position]}</span>
                  <span className="text-xs font-bold uppercase tracking-wide sm:text-sm">
                    {PRIZE_LABELS[position]}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 3 — Name */}
        <section aria-labelledby="step-name">
          <h2 id="step-name" className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal-500">
            4 · Participant Name
          </h2>
          <Field label="Full name" htmlFor="participant-name" required error={nameError ?? undefined}>
            <Input
              id="participant-name"
              inputRef={nameInputRef}
              value={name}
              maxLength={120}
              autoComplete="off"
              autoCapitalize="words"
              placeholder="e.g. Rahul Sharma"
              onChange={(event) => {
                setName(event.target.value)
                setNameError(null)
                setSaved(null)
              }}
              error={nameError ?? undefined}
              disabled={saving}
            />
          </Field>

          {hint ? (
            <Alert tone={hint.tone} className="mt-2">
              {hint.text}
            </Alert>
          ) : null}
        </section>

        {/* 4 — Photo */}
        <section aria-labelledby="step-photo">
          <h2 id="step-photo" className="mb-2 text-sm font-bold uppercase tracking-wide text-charcoal-500">
            5 · Photo (optional)
          </h2>
          <PhotoCapture
            value={photo}
            onChange={(value) => {
              setPhoto(value)
              setPhotoError(null)
              setSaved(null)
            }}
            onError={(message) => setPhotoError(message)}
            disabled={saving}
          />
          {photoError ? (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {photoError}
            </p>
          ) : null}
        </section>

        {/* Save */}
        <div className="sticky bottom-[76px] z-30 -mx-4 border-t border-cream-200 bg-cream-50/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0">
          <Button type="submit" size="lg" fullWidth loading={saving}>
            Save Participant
          </Button>
          <p className="mt-2 text-center text-xs text-charcoal-500">
            Saves as{' '}
            <b className="text-charcoal-700">
              {days.find((day) => day.id === dayId)?.label ?? `Day ${dayId}`} · {selectedGroup?.name ?? '—'} → {PRIZE_EMOJI[prize]} {PRIZE_LABELS[prize]}
            </b>
          </p>
        </div>
      </form>

      <DuplicateDialog
        open={dialogOpen}
        level={duplicateLevel}
        name={name.trim()}
        matches={activeDuplicate}
        targetAgeGroupId={groupId}
        target={{
          ageGroupName: selectedGroup?.name ?? '',
          prize,
          dayLabel: days.find((day) => day.id === dayId)?.label ?? `Day ${dayId}`,
        }}
        targetDayId={dayId}
        loading={saving}
        onCancel={() => setDialogOpen(false)}
        onAddAnyway={() => {
          setDialogOpen(false)
          void submit(true)
        }}
      />
    </div>
  )
}
