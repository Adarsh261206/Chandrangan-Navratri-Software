import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Card'
import {
  IconGroups,
  IconPlus,
  IconSearch,
  IconTrophy,
} from '../components/ui/Icons'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import type { DashboardStats } from '../types'
import { cn } from '../utils/cn'
import { formatDate, formatTime, PRIZE_EMOJI, PRIZE_LABELS } from '../utils/format'

function StatSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="mt-3 h-7 w-14" />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setStats(await api.dashboard.stats())
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={
          stats
            ? `${formatDate(new Date().toISOString())} · ${stats.total_participants} participants registered`
            : 'Navratri prize management'
        }
        actions={
          <Link
            to="/admin/participants/new"
            className="focus-ring hidden min-h-11 items-center gap-2 rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white shadow-card transition-colors hover:bg-maroon-800 sm:inline-flex"
          >
            <IconPlus className="h-4 w-4" />
            Add Participant
          </Link>
        }
      />

      {error ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : (
        <>
          {/* Statistics */}
          <section aria-label="Statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, index) => (
                  <StatSkeleton key={index} />
                ))}
              </>
            ) : stats ? (
              <>
                <StatCard label="Total Participants" value={stats.total_participants} tone="maroon" />
                <StatCard label="Today's Entries" value={stats.today_registrations} tone="gold" />
                <StatCard label="Age Groups" value={stats.total_age_groups} tone="gray" />
                <StatCard
                  label={PRIZE_EMOJI[1] + ' 1st Prize'}
                  value={stats.prizes['1']}
                  tone="rose"
                />
                <StatCard
                  label={PRIZE_EMOJI[2] + ' 2nd Prize'}
                  value={stats.prizes['2']}
                  tone="amber"
                />
                <StatCard
                  label={PRIZE_EMOJI[3] + ' 3rd Prize'}
                  value={stats.prizes['3']}
                  tone="green"
                />
              </>
            ) : null}
          </section>

          {/* Quick actions */}
          <section aria-label="Quick actions" className="mt-6">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-charcoal-500">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <QuickAction
                to="/admin/participants/new"
                icon={<IconPlus className="h-6 w-6" />}
                label="Add Participant"
                description="Register into a prize section"
                primary
              />
              <QuickAction
                to="/admin/age-groups"
                icon={<IconGroups className="h-6 w-6" />}
                label="Age Groups"
                description="Create and organise groups"
              />
              <QuickAction
                to="/admin/results"
                icon={<IconTrophy className="h-6 w-6" />}
                label="View Results"
                description="See winners by section"
              />
              <QuickAction
                to="/admin/participants"
                icon={<IconSearch className="h-6 w-6" />}
                label="Search"
                description="Find a participant"
              />
            </div>
          </section>

          {/* Age group overview */}
          <section aria-label="Age groups overview" className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal-500">
                Age Groups
              </h2>
              <Link
                to="/admin/age-groups"
                className="focus-ring rounded-lg px-2 py-1 text-sm font-semibold text-maroon-700 hover:bg-maroon-50"
              >
                Manage
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="card p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : stats && stats.age_groups.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.age_groups.map((group) => (
                  <Link
                    key={group.id}
                    to={`/admin/age-groups/${group.id}`}
                    className="focus-ring card group p-4 transition-shadow hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold uppercase tracking-wide text-maroon-800">
                        {group.name}
                      </h3>
                      {!group.is_active ? <Badge tone="gray">Disabled</Badge> : null}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-charcoal-600">
                      <span title="1st Prize">
                        {PRIZE_EMOJI[1]} <b>{group.counts['1']}</b>
                      </span>
                      <span title="2nd Prize">
                        {PRIZE_EMOJI[2]} <b>{group.counts['2']}</b>
                      </span>
                      <span title="3rd Prize">
                        {PRIZE_EMOJI[3]} <b>{group.counts['3']}</b>
                      </span>
                    </div>
                    <p className="mt-3 border-t border-cream-200 pt-2 text-sm font-semibold text-charcoal-800">
                      Total: {group.total} participants
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card p-4 text-sm text-charcoal-500">
                No age groups yet. Create one to start registering participants.
              </div>
            )}
          </section>

          {/* Recent registrations */}
          <section aria-label="Recent registrations" className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-charcoal-500">
                Recently Added
              </h2>
            </div>

            {loading ? (
              <div className="card divide-y divide-cream-200">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats && stats.recent.length > 0 ? (
              <ul className="card divide-y divide-cream-200">
                {stats.recent.map((participant) => (
                  <li key={participant.id}>
                    <Link
                      to={`/admin/participants/${participant.id}`}
                      className="focus-ring flex items-center gap-3 p-3 transition-colors hover:bg-cream-100/70 sm:p-4"
                    >
                      <Avatar
                        src={participant.photo_thumb}
                        name={participant.name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal-900">
                          {participant.name}
                        </p>
                        <p className="truncate text-xs text-charcoal-500">
                          {participant.participant_code} · {participant.age_group_name} ·{' '}
                          {PRIZE_EMOJI[participant.prize_position]}{' '}
                          {PRIZE_LABELS[participant.prize_position]}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-charcoal-500">
                        {formatTime(participant.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="card p-4 text-sm text-charcoal-500">
                Participants you add will appear here.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'maroon' | 'gold' | 'gray' | 'rose' | 'amber' | 'green'
}) {
  const tones = {
    maroon: 'text-maroon-700',
    gold: 'text-gold-600',
    gray: 'text-charcoal-700',
    rose: 'text-rose-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
  }
  return (
    <div className="card p-3.5 sm:p-4">
      <p className="truncate text-xs font-semibold text-charcoal-500">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums sm:text-3xl', tones[tone])}>
        {value}
      </p>
    </div>
  )
}

function QuickAction({
  to,
  icon,
  label,
  description,
  primary = false,
}: {
  to: string
  icon: ReactNode
  label: string
  description: string
  primary?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'focus-ring flex min-h-24 flex-col items-start justify-between rounded-2xl border p-4 transition-all active:scale-[0.99]',
        primary
          ? 'border-maroon-700 bg-maroon-700 text-white shadow-card'
          : 'border-cream-200 bg-white text-charcoal-800 shadow-card hover:shadow-card-hover'
      )}
    >
      <span className={cn(primary ? 'text-gold-300' : 'text-maroon-700')}>{icon}</span>
      <div className="mt-3">
        <p className="text-sm font-bold sm:text-base">{label}</p>
        <p
          className={cn(
            'mt-0.5 text-xs',
            primary ? 'text-maroon-100' : 'text-charcoal-500'
          )}
        >
          {description}
        </p>
      </div>
    </Link>
  )
}
