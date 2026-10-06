import { Link } from 'react-router-dom'
import { Avatar } from './ui/Avatar'
import { EmptyState } from './ui/EmptyState'
import { IconPlus } from './ui/Icons'
import { Skeleton } from './ui/Skeleton'
import type { Participant, PrizePosition } from '../types'
import { cn } from '../utils/cn'
import { PRIZE_EMOJI, PRIZE_LONG_LABELS } from '../utils/format'

const columnAccents: Record<PrizePosition, { chip: string; ring: string }> = {
  1: { chip: 'bg-amber-50 text-amber-800 border-amber-200', ring: 'ring-amber-200' },
  2: { chip: 'bg-slate-100 text-slate-700 border-slate-200', ring: 'ring-slate-200' },
  3: { chip: 'bg-orange-50 text-orange-800 border-orange-200', ring: 'ring-orange-200' },
}

interface PrizeColumnProps {
  prize: PrizePosition
  ageGroupId: number
  participants: Participant[]
  loading?: boolean
  /** Navratri day used for the "Add Participant" deep link (?day=N). */
  day?: number
}

export function PrizeColumn({ prize, ageGroupId, participants, loading, day }: PrizeColumnProps) {
  const accent = columnAccents[prize]
  const addPath = `/admin/participants/new?group=${ageGroupId}&prize=${prize}${day ? `&day=${day}` : ''}`

  return (
    <section
      aria-label={PRIZE_LONG_LABELS[prize]}
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-card',
        'min-h-0'
      )}
    >
      <header
        className={cn(
          'flex items-center justify-between gap-2 border-b px-4 py-3',
          accent.chip
        )}
      >
        <h2 className="text-sm font-bold uppercase tracking-wide">
          {PRIZE_EMOJI[prize]} {PRIZE_LONG_LABELS[prize]}
        </h2>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold tabular-nums">
          {loading ? '…' : participants.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl border border-cream-200 p-2.5">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </>
        ) : participants.length === 0 ? (
          <EmptyState
            compact
            icon={<span className="text-xl">{PRIZE_EMOJI[prize]}</span>}
            title={`No ${PRIZE_LONG_LABELS[prize]} entries yet`}
            description="Participants added to this section will appear here."
            action={
              <Link
                to={addPath}
                className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white hover:bg-maroon-800"
              >
                <IconPlus className="h-4 w-4" />
                Add Participant
              </Link>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {participants.map((participant) => (
                <li key={participant.id}>
                  <Link
                    to={`/admin/participants/${participant.id}`}
                    className={cn(
                      'focus-ring flex items-center gap-3 rounded-xl border border-cream-200 bg-white p-2.5',
                      'transition-colors hover:border-cream-300 hover:bg-cream-100/70'
                    )}
                  >
                    <Avatar src={participant.photo_thumb} name={participant.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-charcoal-900">
                        {participant.name}
                      </p>
                      <p className="truncate text-xs text-charcoal-500">
                        {participant.participant_code}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              to={addPath}
              className={cn(
                'focus-ring mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3',
                'text-sm font-semibold text-maroon-700 transition-colors hover:border-maroon-300 hover:bg-maroon-50'
              )}
            >
              <IconPlus className="h-4 w-4" />
              Add Participant
            </Link>
          </>
        )}
      </div>
    </section>
  )
}
