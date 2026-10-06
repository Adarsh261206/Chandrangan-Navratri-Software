import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { ResultsView } from '../components/ResultsView'
import { LoadError } from '../components/LoadError'
import { Skeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../services/api'
import type { PublicAgeGroup } from '../types'
import { cn } from '../utils/cn'

export default function ResultsAdminPage() {
  const [groups, setGroups] = useState<PublicAgeGroup[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.results.public()
      setGroups(result.age_groups)
      setSelectedId((current) => current ?? result.age_groups[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load results.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selected = groups.find((group) => group.id === selectedId) ?? null
  const totalWinners = groups.reduce((sum, group) => sum + group.total, 0)

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
          <LoadError message={error} onRetry={() => void load()} />
        ) : selected ? (
          <ResultsView key={selected.id} group={selected} variant="admin" />
        ) : (
          <LoadError message="No results are available yet." />
        )}
      </div>
    </div>
  )
}
