import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { LoadError } from '../components/LoadError'
import { PrizeColumn } from '../components/PrizeColumn'
import { Badge } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { IconPlus } from '../components/ui/Icons'
import { api, ApiError } from '../services/api'
import type { AgeGroup, Participant, PrizePosition } from '../types'
import { PRIZE_EMOJI } from '../utils/format'

export default function AgeGroupDetailPage() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const id = Number(groupId)

  const [group, setGroup] = useState<AgeGroup | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setError('Age group not found.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [groupData, participantData] = await Promise.all([
        api.ageGroups.get(id),
        api.participants.list({ age_group_id: id, per_page: 100 }),
      ])
      setGroup(groupData)
      setParticipants(participantData.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this age group.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const byPrize = (prize: PrizePosition): Participant[] =>
    participants.filter((participant) => participant.prize_position === prize)

  return (
    <div>
      <PageHeader
        title={loading ? 'Loading…' : (group?.name ?? 'Age Group')}
        subtitle={
          group
            ? `${group.total} participant${group.total === 1 ? '' : 's'} across three prize sections`
            : 'Prize sections'
        }
        backTo="/admin/age-groups"
        backLabel="All age groups"
        actions={
          <>
            {group && !group.is_active ? <Badge tone="gray">Disabled</Badge> : null}
            <Button
              icon={<IconPlus className="h-4 w-4" />}
              onClick={() => navigate(`/admin/participants/new?group=${id}&prize=1`)}
            >
              Add Participant
            </Button>
          </>
        }
      />

      {error ? (
        <LoadError message={error} onRetry={() => void load()} />
      ) : (
        <>
          {group && !group.is_active ? (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This age group is disabled — new registrations are paused. You can still view
              existing participants.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {([1, 2, 3] as PrizePosition[]).map((prize) => (
              <PrizeColumn
                key={prize}
                prize={prize}
                ageGroupId={id}
                participants={byPrize(prize)}
                loading={loading}
              />
            ))}
          </div>

          {!loading && group ? (
            <p className="mt-4 text-center text-sm text-charcoal-500">
              {PRIZE_EMOJI[1]} {group.counts['1']} · {PRIZE_EMOJI[2]} {group.counts['2']} ·{' '}
              {PRIZE_EMOJI[3]} {group.counts['3']} — {group.total} total
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
