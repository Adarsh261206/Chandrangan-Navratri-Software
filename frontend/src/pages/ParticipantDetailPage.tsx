import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { IconEye, IconTrash } from '../components/ui/Icons'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useToast } from '../hooks/useToast'
import type { Participant, PrizePosition } from '../types'
import { PRIZE_EMOJI, PRIZE_LABELS, formatLongDate } from '../utils/format'
import { cn } from '../utils/cn'

export default function ParticipantDetailPage() {
  const { participantId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const id = Number(participantId)

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [movingTo, setMovingTo] = useState<PrizePosition | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setError('Participant not found.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setParticipant(await api.participants.get(id))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this participant.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await api.participants.remove(id)
      toast.success('Participant removed')
      navigate('/admin/participants', { replace: true })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete participant')
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const moveTo = async (target: PrizePosition) => {
    if (movingTo !== null) return
    setMovingTo(target)
    try {
      const result = await api.participants.move(id, target)
      toast.success(
        result.swapped_with ? 'Prize positions swapped' : 'Winner moved',
        {
          description: result.swapped_with
            ? `${result.participant.name} → ${PRIZE_LABELS[target]} · ${result.swapped_with.name} → ${PRIZE_LABELS[result.swapped_with.prize_position]}`
            : `${result.participant.name} → ${PRIZE_LABELS[target]}`,
        }
      )
      await load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not move this winner')
    } finally {
      setMovingTo(null)
    }
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Participant" backTo="/admin/participants" backLabel="Participants" />
        <LoadError message={error} onRetry={() => void load()} />
      </div>
    )
  }

  if (loading || !participant) {
    return (
      <div>
        <PageHeader title="Participant" backTo="/admin/participants" backLabel="Participants" />
        <div className="card p-5">
          <Skeleton className="mx-auto aspect-square w-full max-w-xs rounded-2xl" />
          <Skeleton className="mt-5 h-7 w-48" />
          <Skeleton className="mt-3 h-4 w-32" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  const history = participant.history ?? []
  const otherRegistrations = history.length - 1

  return (
    <div>
      <PageHeader
        title="Participant Details"
        backTo="/admin/participants"
        backLabel="Participants"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Photo */}
        <div className="card p-4">
          {participant.photo ? (
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="focus-ring group relative block w-full overflow-hidden rounded-2xl bg-cream-100"
              aria-label="View full-size photo"
            >
              <img
                src={participant.photo}
                alt={`Photo of ${participant.name}`}
                width={participant.photo_width ?? 800}
                height={participant.photo_height ?? 800}
                decoding="async"
                className="aspect-square w-full object-cover"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-charcoal-900/70 px-2.5 py-1.5 text-xs font-semibold text-white opacity-90">
                <IconEye className="h-3.5 w-3.5" />
                View
              </span>
            </button>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-cream-100">
              <Avatar name={participant.name} size="xl" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="maroon">{participant.participant_code}</Badge>
            <Badge tone="gold">{PRIZE_EMOJI[participant.prize_position]} {PRIZE_LABELS[participant.prize_position]}</Badge>
            <Badge tone="maroon">{participant.day_label ?? `Day ${participant.day_id}`}</Badge>
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div className="card p-5">
            <h1 className="text-2xl font-bold text-charcoal-900">{participant.name}</h1>
            <p className="mt-1 text-sm text-charcoal-500">
              Registered on <b className="text-charcoal-700">{formatLongDate(participant.created_at)}</b>
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cream-200 bg-cream-100/70 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal-500">
                  Navratri Day
                </p>
                <p className="mt-1 text-base font-semibold text-charcoal-900">
                  {participant.day_label ?? `Day ${participant.day_id}`}
                  {participant.day_date ? (
                    <span className="ml-1.5 text-sm font-medium text-charcoal-500">
                      {participant.day_date}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="rounded-xl border border-cream-200 bg-cream-100/70 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal-500">
                  Age Group
                </p>
                <p className="mt-1 text-base font-semibold text-charcoal-900">
                  {participant.age_group_name}
                </p>
              </div>
            </div>

            {/* Move to another prize (swap within the same day + group) */}
            <div className="mt-4 rounded-xl border border-cream-200 bg-cream-100/70 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-charcoal-500">
                Prize Section
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Move to prize">
                {([1, 2, 3] as PrizePosition[]).map((position) => {
                  const current = position === participant.prize_position
                  const blocked = (participant.occupied_slots?.[position] ?? 0) > 0
                  return (
                    <button
                      key={position}
                      type="button"
                      disabled={current || movingTo !== null}
                      aria-pressed={current}
                      onClick={() => void moveTo(position)}
                      className={cn(
                        'focus-ring flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 transition-colors',
                        current
                          ? 'border-maroon-700 bg-maroon-700 text-white shadow-card'
                          : 'border-cream-300 bg-white text-charcoal-600 hover:bg-cream-50',
                        !current && movingTo !== null && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <span className="text-base leading-none">{PRIZE_EMOJI[position]}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">
                        {PRIZE_LABELS[position]}
                        {!current && blocked ? ' · swap' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-xs text-charcoal-500">
                Occupied sections swap both winners; empty sections just move this winner.
              </p>
            </div>

            <div className="mt-4 border-t border-cream-200 pt-4">
              <Button
                variant="secondary"
                fullWidth
                icon={<IconTrash className="h-4 w-4" />}
                onClick={() => setConfirmDelete(true)}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Delete Participant
              </Button>
            </div>
          </div>

          {/* Registration history */}
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-charcoal-900">Registration History</h2>
              {otherRegistrations > 0 ? (
                <Badge tone="gold">{history.length} entries</Badge>
              ) : null}
            </div>

            <ol className="mt-3 flex flex-col">
              {history.map((item, index) => (
                <li key={`${item.participant_id}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.is_current ? 'bg-maroon-700' : 'bg-cream-300'
                    }`}
                  />
                  {index < history.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-[4.5px] top-4 h-full w-px bg-cream-300"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal-900">
                      {item.day_label} · {item.age_group_name} → {PRIZE_EMOJI[item.prize_position]}{' '}
                      {PRIZE_LABELS[item.prize_position]}
                      {item.is_current ? (
                        <span className="ml-2 inline-block rounded-full bg-maroon-50 px-2 py-0.5 text-[11px] font-bold text-maroon-700">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-charcoal-500">
                      {item.participant_code} · {formatLongDate(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete participant?"
        destructive
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        message={
          <>
            <p className="text-base font-semibold text-charcoal-900">{participant.name}</p>
            <p className="mt-0.5 font-medium text-charcoal-600">{participant.participant_code}</p>
            <p className="mt-2">This action cannot be undone.</p>
          </>
        }
      />

      <Modal open={lightbox} onClose={() => setLightbox(false)} size="lg" title={participant.name}>
        <div className="pb-4">
          <img
            src={participant.photo ?? ''}
            alt={`Photo of ${participant.name}`}
            width={participant.photo_width ?? 800}
            height={participant.photo_height ?? 800}
            decoding="async"
            className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain"
          />
          <p className="mt-3 text-center text-sm text-charcoal-500">
            {participant.participant_code} · {participant.day_label} · {participant.age_group_name} ·{' '}
            {PRIZE_LABELS[participant.prize_position]}
          </p>
        </div>
      </Modal>
    </div>
  )
}
