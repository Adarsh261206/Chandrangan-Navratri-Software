import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { ParticipantCard } from '../components/ParticipantCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { IconChevronLeft, IconChevronRight, IconPlus, IconSearch, IconX } from '../components/ui/Icons'
import { SkeletonList } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import type { EventDay, Paginated, Participant } from '../types'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { DaySelector } from '../components/DaySelector'
import { useDayParam } from '../hooks/useDayParam'

export default function ParticipantsPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 350)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paginated<Participant> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const [days, setDays] = useState<EventDay[]>([])
  const [daysLoading, setDaysLoading] = useState(true)
  const [todayId, setTodayId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useDayParam(days, todayId)

  const trimmedQuery = debouncedQuery.trim()

  const load = useCallback(
    async (targetPage: number, search: string, dayId: number) => {
      const id = ++requestId.current
      setLoading(true)
      setError(null)
      try {
        const result = search
          ? await api.participants.search(search, targetPage, 12, dayId)
          : await api.participants.list({ page: targetPage, per_page: 12, day_id: dayId })
        if (id !== requestId.current) return
        setData(result)
      } catch (err) {
        if (id !== requestId.current) return
        setError(err instanceof ApiError ? err.message : 'Could not load participants.')
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    let cancelled = false
    api.eventDays
      .list()
      .then((payload) => {
        if (!cancelled) {
          setDays(payload.days)
          setTodayId(payload.today_id)
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDaysLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setPage(1)
  }, [trimmedQuery, selectedDay])

  useEffect(() => {
    void load(page, trimmedQuery, selectedDay)
  }, [page, trimmedQuery, selectedDay, load])

  const pagination = data?.pagination
  const items = data?.items ?? []

  return (
    <div>
      <PageHeader
        title="Participants"
        subtitle="Search by name, participant ID or age group."
        actions={
          <Link
            to={`/admin/participants/new?day=${selectedDay}`}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white shadow-card hover:bg-maroon-800"
          >
            <IconPlus className="h-4 w-4" />
            Add
          </Link>
        }
      />

      <DaySelector
        days={days}
        value={selectedDay}
        onChange={setSelectedDay}
        loading={daysLoading}
      />

      <div className="mt-4 relative">
        <label htmlFor="participant-search" className="sr-only">
          Search participants
        </label>
        <IconSearch
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-charcoal-500"
          aria-hidden="true"
        />
        <input
          id="participant-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or participant ID"
          autoComplete="off"
          className="focus-ring min-h-12 w-full rounded-xl border border-cream-300 bg-white pl-11 pr-11 text-base text-charcoal-900 placeholder:text-charcoal-500 focus:border-maroon-500"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="focus-ring absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-charcoal-500 hover:bg-cream-100"
          >
            <IconX className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm text-charcoal-500" role="status">
          {loading
            ? 'Searching…'
            : pagination
              ? `${pagination.total} ${trimmedQuery ? (pagination.total === 1 ? 'match' : 'matches') : (pagination.total === 1 ? 'participant' : 'participants')} on Day ${selectedDay}`
              : ''}
        </p>
        {!trimmedQuery ? (
          <p className="text-xs text-charcoal-500">All days · newest first</p>
        ) : null}
      </div>

      <div className="mt-3">
        {error ? (
          <LoadError message={error} onRetry={() => void load(page, trimmedQuery, selectedDay)} />
        ) : loading ? (
          <SkeletonList count={5} />
        ) : items.length === 0 ? (
          trimmedQuery ? (
            <EmptyState
              icon={<IconSearch className="h-6 w-6" />}
              title={`No results for “${trimmedQuery}”`}
              description="Check the spelling, or try searching by participant ID such as NAV-0001."
              action={
                <Button variant="secondary" fullWidth onClick={() => setQuery('')}>
                  Clear Search
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<IconSearch className="h-6 w-6" />}
              title="No participants yet"
              description="Registered participants will appear here."
              action={
                <Link
                  to={`/admin/participants/new?day=${selectedDay}`}
                  className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-xl bg-maroon-700 px-4 text-sm font-semibold text-white hover:bg-maroon-800"
                >
                  <IconPlus className="h-4 w-4" />
                  Add Participant
                </Link>
              }
            />
          )
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((participant) => (
              <li key={participant.id}>
                <ParticipantCard participant={participant} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pagination && pagination.total_pages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <Button
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            icon={<IconChevronLeft className="h-4 w-4" />}
          >
            Previous
          </Button>
          <span className="text-sm text-charcoal-600">
            Page <b>{pagination.page}</b> of <b>{pagination.total_pages}</b>
          </span>
          <Button
            variant="secondary"
            disabled={page >= pagination.total_pages || loading}
            onClick={() => setPage((current) => current + 1)}
            iconRight={<IconChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  )
}
