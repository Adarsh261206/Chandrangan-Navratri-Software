import { useCallback, useEffect, useRef, useState } from 'react'
import { ResultsView } from '../components/ResultsView'
import { DaySelector } from '../components/DaySelector'
import { LoadError } from '../components/LoadError'
import { IconTrophy } from '../components/ui/Icons'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useDayParam } from '../hooks/useDayParam'
import type { EventDay, PublicAgeGroup } from '../types'
import { cn } from '../utils/cn'

export default function PublicResultsPage() {
  const [groups, setGroups] = useState<PublicAgeGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<EventDay[]>([])
  const [todayId, setTodayId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useDayParam(days, todayId, { persist: false })

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
      setError(err instanceof ApiError ? err.message : 'Could not load results.')
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [])

  // Always fetch the selected day (?day=N), never the server default.
  useEffect(() => {
    void load(selectedDay)
  }, [load, selectedDay])

  const selected = groups.find((group) => group.id === selectedId) ?? null

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
          <ResultsView key={`${selectedDay}-${selected.id}`} group={selected} variant="public" />
        ) : (
          <LoadError message="No results are available yet." />
        )}
      </div>
    </div>
  )
}
