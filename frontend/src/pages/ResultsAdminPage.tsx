import { useCallback, useEffect, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { ResultsView } from '../components/ResultsView'
import { DaySelector } from '../components/DaySelector'
import { LoadError } from '../components/LoadError'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import { useDayParam } from '../hooks/useDayParam'
import { usePrizeMove } from '../hooks/usePrizeMove'
import type { EventDay, PublicAgeGroup } from '../types'
import { cn } from '../utils/cn'

export default function ResultsAdminPage() {
  const [groups, setGroups] = useState<PublicAgeGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState<EventDay[]>([])
  const [todayId, setTodayId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useDayParam(days, todayId)

  const loadSeq = useRef(0)

  const loadForDay = useCallback(async (dayId: number) => {
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
    void loadForDay(selectedDay)
  }, [loadForDay, selectedDay])

  const selected = groups.find((group) => group.id === selectedId) ?? null
  const totalWinners = groups.reduce((sum, group) => sum + group.total, 0)

  const { moving, move } = usePrizeMove({
    dayId: selectedDay,
    ageGroupId: selectedId,
    onChanged: () => loadForDay(selectedDay),
  })

  return (
    <div>
      <PageHeader
        title="Results"
        subtitle={
          loading
            ? 'Loading results…'
            : `${totalWinners} announced winner${totalWinners === 1 ? '' : 's'} across ${groups.length} age groups.`
        }
      />

      <div className="mt-4">
        <DaySelector days={days} value={selectedDay} onChange={setSelectedDay} loading={loading} />
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="flex gap-2" aria-hidden="true">
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
          <LoadError message={error} onRetry={() => void loadForDay(selectedDay)} />
        ) : selected ? (
          <ResultsView
            key={`${selectedDay}-${selected.id}`}
            group={selected}
            variant="admin"
            onMove={(prize, direction) => void move(prize, direction)}
            moving={moving}
          />
        ) : (
          <LoadError message="No results are available yet." />
        )}
      </div>
    </div>
  )
}
