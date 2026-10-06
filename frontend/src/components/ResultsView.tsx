import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from './ui/EmptyState'
import { Modal } from './ui/Modal'
import { Skeleton } from './ui/Skeleton'
import { IconChevronRight, IconEye } from './ui/Icons'
import type { PublicAgeGroup, PublicWinner, PrizePosition } from '../types'
import { PRIZE_EMOJI, PRIZE_LONG_LABELS, formatDate } from '../utils/format'
import { cn } from '../utils/cn'
import { initials } from '../utils/format'

const prizeAccent: Record<PrizePosition, string> = {
  1: 'border-amber-300 bg-amber-50/70 text-amber-900',
  2: 'border-slate-300 bg-slate-50/80 text-slate-800',
  3: 'border-orange-300 bg-orange-50/70 text-orange-900',
}

interface ResultsViewProps {
  group: PublicAgeGroup
  /** Public pages hide admin-only details such as registration dates. */
  variant?: 'public' | 'admin'
  loading?: boolean
}

export function ResultsView({ group, variant = 'public', loading = false }: ResultsViewProps) {
  const [lightbox, setLightbox] = useState<PublicWinner | null>(null)

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        {[1, 2, 3].map((prize) => (
          <div key={prize}>
            <Skeleton className="h-5 w-40" />
            <div className="mt-3 flex flex-col gap-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3 border-b border-cream-300 pb-3">
        <h2 className="text-2xl font-extrabold uppercase tracking-wide text-maroon-800">
          {group.name}
        </h2>
        <p className="shrink-0 text-sm font-semibold text-charcoal-500">
          {group.total} winner{group.total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {([1, 2, 3] as PrizePosition[]).map((prize) => {
          const winners = group.prizes[prize]
          return (
            <section key={prize} aria-label={`${group.name} ${PRIZE_LONG_LABELS[prize]}`}>
              <div
                className={cn(
                  'mb-3 flex items-center justify-between gap-2 rounded-xl border px-4 py-2.5',
                  prizeAccent[prize]
                )}
              >
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {PRIZE_EMOJI[prize]} {PRIZE_LONG_LABELS[prize]}
                </h3>
                <span className="text-xs font-bold tabular-nums opacity-70">
                  {winners.length}
                </span>
              </div>

              {winners.length === 0 ? (
                <EmptyState
                  compact
                  title={`No ${PRIZE_LONG_LABELS[prize].toLowerCase()} entries yet`}
                  description={
                    variant === 'admin'
                      ? 'Winners added to this section will appear here.'
                      : 'Results for this section will appear once announced.'
                  }
                  action={
                    variant === 'admin' ? (
                      <Link
                        to={`/admin/participants/new?group=${group.id}&prize=${prize}`}
                        className="focus-ring flex min-h-11 items-center justify-center rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white hover:bg-maroon-800"
                      >
                        Add Participant
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {winners.map((winner, index) => (
                    <li
                      key={`${winner.name}-${index}`}
                      className="card flex items-center gap-4 p-3 sm:p-4"
                    >
                      <button
                        type="button"
                        onClick={() => setLightbox(winner)}
                        className="focus-ring shrink-0 rounded-full"
                        aria-label={`View photo of ${winner.name}`}
                      >
                        {winner.photo_thumb || winner.photo ? (
                          <img
                            src={winner.photo_thumb ?? winner.photo ?? ''}
                            alt=""
                            width={80}
                            height={80}
                            loading="lazy"
                            decoding="async"
                            className="h-16 w-16 rounded-full border-2 border-white object-cover shadow-card sm:h-20 sm:w-20"
                          />
                        ) : (
                          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 text-lg font-bold text-cream-100 sm:h-20 sm:w-20">
                            {initials(winner.name)}
                          </span>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold text-charcoal-900 sm:text-xl">
                          {winner.name}
                        </p>
                        <p className="mt-0.5 text-sm text-charcoal-500">
                          {group.name} · {PRIZE_EMOJI[prize]} {PRIZE_LONG_LABELS[prize]}
                        </p>
                        {variant === 'admin' ? (
                          <p className="mt-0.5 text-xs text-charcoal-500">
                            Registered {formatDate(winner.registered_on)}
                          </p>
                        ) : null}
                      </div>

                      {winner.photo ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(winner)}
                          className="focus-ring hidden h-10 w-10 items-center justify-center rounded-xl border border-cream-300 text-charcoal-500 hover:bg-cream-100 sm:flex"
                          aria-label={`View photo of ${winner.name}`}
                        >
                          <IconEye className="h-5 w-5" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <Modal open={lightbox !== null} onClose={() => setLightbox(null)} size="sm">
        {lightbox ? (
          <div className="pb-4 text-center">
            {lightbox.photo ? (
              <img
                src={lightbox.photo}
                alt={`Photo of ${lightbox.name}`}
                width={800}
                height={800}
                decoding="async"
                className="mx-auto max-h-[65vh] w-auto rounded-xl object-contain"
              />
            ) : (
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 text-4xl font-bold text-cream-100">
                {initials(lightbox.name)}
              </div>
            )}
            <p className="mt-4 text-lg font-bold text-charcoal-900">{lightbox.name}</p>
            <p className="text-sm text-charcoal-500">{group.name}</p>
          </div>
        ) : null}
      </Modal>

      {variant === 'admin' ? (
        <Link
          to={`/admin/age-groups/${group.id}`}
          className="focus-ring mt-6 flex min-h-11 items-center justify-center gap-1 rounded-xl border border-cream-300 bg-white text-sm font-semibold text-charcoal-700 hover:bg-cream-100"
        >
          Open in age group view
          <IconChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  )
}
