import { useCallback, useEffect, useRef, useState } from 'react'
import { ResultsView } from '../components/ResultsView'
import { DaySelector } from '../components/DaySelector'
import { DuplicateDialog } from '../components/DuplicateDialog'
import { LoadError } from '../components/LoadError'
import { PhotoCapture } from '../components/PhotoCapture'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Form'
import { IconTrophy } from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useToast } from '../hooks/useToast'
import { useDayParam } from '../hooks/useDayParam'
import { usePrizeMove } from '../hooks/usePrizeMove'
import type {
  DuplicateLevel,
  DuplicateMatch,
  EventDay,
  PrizePosition,
  PublicAgeGroup,
} from '../types'
import type { CompressedImage } from '../utils/image'
import { PRIZE_EMOJI, PRIZE_LONG_LABELS } from '../utils/format'
import { pickPrimaryMatch } from '../utils/duplicates'
import { cn } from '../utils/cn'

function makeRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function SimpleHomePage() {
  const toast = useToast()

  const [groups, setGroups] = useState<PublicAgeGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<EventDay[]>([])
  const [todayId, setTodayId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useDayParam(days, todayId)

  /* ---- add-name modal ---- */
  const [addPrize, setAddPrize] = useState<PrizePosition | null>(null)
  const [addDayId, setAddDayId] = useState(1)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<CompressedImage | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [liveDuplicate, setLiveDuplicate] = useState<DuplicateMatch[] | null>(null)
  const [duplicateLevel, setDuplicateLevel] = useState<
    Exclude<DuplicateLevel, 'none'> | null
  >(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const requestIdRef = useRef<string>(makeRequestId())
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  const loadSeq = useRef(0)

  const load = useCallback(async (dayId: number) => {
    const seq = ++loadSeq.current
    setLoading(true)
    setError(null)
    try {
      const [result, dayList] = await Promise.all([
        api.results.public(undefined, dayId),
        api.eventDays.list(),
      ])
      if (seq !== loadSeq.current) return // a newer day was requested
      setDays(dayList.days)
      setTodayId(dayList.today_id)
      setGroups(result.age_groups)
      setSelectedId((current) => current ?? result.age_groups[0]?.id ?? null)
    } catch (err) {
      if (seq !== loadSeq.current) return
      setError(err instanceof ApiError ? err.message : 'Could not load reports.')
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [])

  // Initial load AND day switches always fetch the selected day — never the
  // server default — so the board can't show a different day than the chips.
  useEffect(() => {
    void load(selectedDay)
  }, [load, selectedDay])

  const selected = groups.find((group) => group.id === selectedId) ?? null
  const activeGroup = groups.find((group) => group.id === selectedId) ?? null

  const { moving, move } = usePrizeMove({
    dayId: selectedDay,
    ageGroupId: selectedId,
    onChanged: () => load(selectedDay),
  })

  /* Live duplicate check while the modal is open */
  useEffect(() => {
    const trimmed = name.trim()
    if (addPrize === null || trimmed.length < 2 || selectedId === null) {
      setLiveDuplicate(null)
      setDuplicateLevel(null)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api.participants
        .checkDuplicate(trimmed, selectedId, addPrize, addDayId, controller.signal)
        .then((result) => {
          setLiveDuplicate(result.matches)
          setDuplicateLevel(result.level === 'none' ? null : result.level)
        })
        .catch(() => {
          // Authoritative check runs on save.
        })
    }, 450)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [name, addPrize, selectedId, addDayId])

  const openAdd = (prize: PrizePosition) => {
    setName('')
    setNameError(null)
    setPhoto(null)
    setPhotoError(null)
    setLiveDuplicate(null)
    setDuplicateLevel(null)
    setDialogOpen(false)
    requestIdRef.current = makeRequestId()
    setAddDayId(selectedDay)
    setAddPrize(prize)
    window.setTimeout(() => nameInputRef.current?.focus(), 120)
  }

  const closeAdd = () => {
    if (saving) return
    setAddPrize(null)
  }

  const activeDuplicate = liveDuplicate ?? []
  const hintMatch = duplicateLevel
    ? pickPrimaryMatch(duplicateLevel, activeDuplicate, {
        ageGroupId: selectedId,
        prize: addPrize ?? 1,
        dayId: addDayId,
      })
    : null
  const hint =
    duplicateLevel && hintMatch
      ? duplicateLevel === 'exact'
        ? `${hintMatch.name} is already registered in ${hintMatch.age_group_name} → ${PRIZE_EMOJI[hintMatch.prize_position]} ${PRIZE_LONG_LABELS[hintMatch.prize_position]}.`
        : duplicateLevel === 'group'
          ? `${hintMatch.name} is already in this age group. Please verify before saving.`
          : `${hintMatch.name} was previously registered in ${hintMatch.day_label}, ${hintMatch.age_group_name}. Continue if this is a different person.`
      : null

  const submit = async (force: boolean) => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setNameError('Please enter the name.')
      nameInputRef.current?.focus()
      return
    }
    if (addPrize === null || selectedId === null) return
    setNameError(null)

    setSaving(true)
    const formData = new FormData()
    formData.append('name', trimmed)
    formData.append('age_group_id', String(selectedId))
    formData.append('prize_position', String(addPrize))
    formData.append('day_id', String(addDayId))
    formData.append('request_id', requestIdRef.current)
    if (force) formData.append('force', '1')
    if (photo) formData.append('photo', photo.blob, photo.filename)

    try {
      await api.participants.create(formData)
      setDialogOpen(false)
      setDuplicateLevel(null)
      setLiveDuplicate(null)
      setAddPrize(null)
      toast.success('Name added', {
        description: `${trimmed} • Day ${addDayId} • ${activeGroup?.name ?? ''} • ${PRIZE_LONG_LABELS[addPrize]}`,
      })
      // Show the day the entry landed in — never leave the admin on another day
      // looking at the previous winner.
      if (addDayId !== selectedDay) {
        setSelectedDay(addDayId)
      } else {
        await load(selectedDay)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const level = err.duplicateLevel as Exclude<DuplicateLevel, 'none'> | null
        if (level) {
          const payload = err.payload as { matches?: DuplicateMatch[] } | null
          setLiveDuplicate(payload?.matches ?? [])
          setDuplicateLevel(level)
          setDialogOpen(true)
        } else if (err.isValidation) {
          if (err.fieldErrors.photo) setPhotoError(err.fieldErrors.photo)
          if (err.fieldErrors.name) setNameError(err.fieldErrors.name)
          toast.error(err.message)
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Could not save this name. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-700 to-maroon-900 text-2xl shadow-card">
          <IconTrophy className="h-7 w-7 text-gold-400" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold text-charcoal-900 sm:text-4xl">
          Prize Results
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-charcoal-600">
          ChandranganXSumit Navratrotsav winners, announced group by group.
        </p>
      </header>

      <div className="mt-7">
        <DaySelector days={days} value={selectedDay} onChange={setSelectedDay} loading={loading} />
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex gap-2 overflow-hidden" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full" />
            ))}
          </div>
        ) : error ? null : (
          <div
            role="tablist"
            aria-label="Select age group"
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
          >
            {groups.map((group) => (
              <button
                key={group.id}
                role="tab"
                aria-selected={group.id === selectedId}
                type="button"
                onClick={() => setSelectedId(group.id)}
                className={cn(
                  'focus-ring min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-semibold transition-colors',
                  group.id === selectedId
                    ? 'border-maroon-700 bg-maroon-700 text-white shadow-card'
                    : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-100'
                )}
              >
                {group.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : error ? (
          <LoadError message={error} onRetry={() => void load(selectedDay)} />
        ) : selected ? (
          <ResultsView
            key={`${selectedDay}-${selected.id}`}
            group={selected}
            variant="public"
            onAdd={openAdd}
            onMove={(prize, direction) => void move(prize, direction)}
            moving={moving}
          />
        ) : (
          <LoadError message="No reports are available yet." />
        )}
      </div>

      {/* ---------------------------------------------- add name modal */}
      <Modal
        open={addPrize !== null}
        onClose={closeAdd}
        size="sm"
        title="Add name"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeAdd} disabled={saving} fullWidth>
              Cancel
            </Button>
            <Button
              onClick={() => void submit(false)}
              loading={saving}
              fullWidth
            >
              Save
            </Button>
          </div>
        }
      >
        {addPrize !== null ? (
          <div className="pb-2">
            <p className="mb-4 rounded-xl border border-cream-200 bg-cream-100 px-3 py-2.5 text-center text-base font-bold text-maroon-800">
              {days.find((day) => day.id === addDayId)?.label ?? `Day ${addDayId}`} →{' '}
              {activeGroup?.name ?? ''} → {PRIZE_EMOJI[addPrize]}{' '}
              {PRIZE_LONG_LABELS[addPrize]}
            </p>

            <Field label="Day" htmlFor="report-day" required>
              <Select
                id="report-day"
                value={String(addDayId)}
                disabled={saving}
                onChange={(event) => {
                  setAddDayId(Number(event.target.value))
                  setLiveDuplicate(null)
                  setDuplicateLevel(null)
                }}
              >
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label} · {day.date}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Name" htmlFor="report-name" required error={nameError ?? undefined}>
              <Input
                id="report-name"
                inputRef={nameInputRef}
                value={name}
                maxLength={120}
                autoComplete="off"
                autoCapitalize="words"
                placeholder="e.g. Rahul Sharma"
                error={nameError ?? undefined}
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError(null)
                }}
              />
            </Field>

            {hint ? (
              <Alert
                tone={duplicateLevel === 'exact' ? 'danger' : 'warning'}
                className="mt-3"
              >
                {hint}
              </Alert>
            ) : null}

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-charcoal-800">
                Photo <span className="font-normal text-charcoal-500">(optional)</span>
              </p>
              <PhotoCapture
                value={photo}
                onChange={(value) => {
                  setPhoto(value)
                  setPhotoError(null)
                }}
                onError={(message) => setPhotoError(message)}
                disabled={saving}
              />
              {photoError ? (
                <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                  {photoError}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <DuplicateDialog
        open={dialogOpen}
        level={duplicateLevel}
        name={name.trim()}
        matches={activeDuplicate}
        targetAgeGroupId={selectedId}
        target={{
          ageGroupName: activeGroup?.name ?? '',
          prize: addPrize ?? 1,
          dayLabel: days.find((day) => day.id === addDayId)?.label ?? `Day ${addDayId}`,
        }}
        targetDayId={addDayId}
        loading={saving}
        onCancel={() => setDialogOpen(false)}
        onAddAnyway={() => void submit(true)}
      />
    </div>
  )
}
