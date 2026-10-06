import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import type { DuplicateLevel, DuplicateMatch, PrizePosition } from '../types'
import { PRIZE_EMOJI, PRIZE_LABELS, formatLongDate } from '../utils/format'
import { pickPrimaryMatch } from '../utils/duplicates'

interface DuplicateDialogProps {
  open: boolean
  level: Exclude<DuplicateLevel, 'none'> | null
  name: string
  matches: DuplicateMatch[]
  target: { ageGroupName: string; prize: PrizePosition }
  targetAgeGroupId?: number | null
  loading?: boolean
  onCancel: () => void
  onAddAnyway: () => void
}

function slot(match: DuplicateMatch): string {
  return `${match.age_group_name} → ${PRIZE_EMOJI[match.prize_position]} ${PRIZE_LABELS[match.prize_position]}`
}

export function DuplicateDialog({
  open,
  level,
  name,
  matches,
  target,
  targetAgeGroupId = null,
  loading = false,
  onCancel,
  onAddAnyway,
}: DuplicateDialogProps) {
  const primary = level
    ? pickPrimaryMatch(level, matches, { ageGroupId: targetAgeGroupId, prize: target.prize })
    : matches[0] ?? null
  const targetSlot = `${target.ageGroupName} → ${PRIZE_EMOJI[target.prize]} ${PRIZE_LABELS[target.prize]}`

  const title =
    level === 'exact'
      ? 'Duplicate Entry'
      : level === 'group'
        ? 'Participant Already Registered'
        : 'Previously Registered'

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      size="sm"
      title={title}
      footer={
        level === 'exact' ? (
          <Button variant="secondary" fullWidth onClick={onCancel} loading={loading}>
            Close
          </Button>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onCancel} disabled={loading} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={onAddAnyway} loading={loading} fullWidth>
              Add Anyway
            </Button>
          </div>
        )
      }
    >
      <div className="pb-2 text-sm leading-relaxed text-charcoal-700">
        {level === 'exact' ? (
          <>
            <p>
              <b>{primary?.name ?? name}</b> is already registered in:
            </p>
            <p className="my-3 rounded-xl border border-cream-200 bg-cream-100 px-3 py-2.5 text-center text-base font-bold text-maroon-800">
              {primary ? slot(primary) : targetSlot}
            </p>
            {primary ? (
              <p className="text-charcoal-600">
                Registered on: <b>{formatLongDate(primary.created_at)}</b>
              </p>
            ) : null}
            <p className="mt-3 font-medium text-red-700">
              This participant cannot be added again here.
            </p>
          </>
        ) : level === 'group' ? (
          <>
            <p>
              <b>{primary?.name ?? name}</b> is already registered in:
            </p>
            <p className="my-3 rounded-xl border border-cream-200 bg-cream-100 px-3 py-2.5 text-center text-base font-bold text-maroon-800">
              {primary ? slot(primary) : ''}
            </p>
            <p>You are trying to add the same name to:</p>
            <p className="my-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-base font-bold text-amber-900">
              {targetSlot}
            </p>
            <p className="font-medium text-charcoal-800">Please verify this participant.</p>
          </>
        ) : (
          <>
            <p>
              <b>{primary?.name ?? name}</b> was previously registered as:
            </p>
            <p className="my-3 rounded-xl border border-cream-200 bg-cream-100 px-3 py-2.5 text-center text-base font-bold text-maroon-800">
              {primary ? slot(primary) : ''}
            </p>
            <p>You are now registering:</p>
            <p className="my-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-base font-bold text-amber-900">
              {targetSlot}
            </p>
            <p className="font-medium text-charcoal-800">
              If this is a different person, continue.
            </p>
          </>
        )}

        {matches.length > 1 ? (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-charcoal-500">
              All registrations with this name
            </p>
            <ul className="divide-y divide-cream-200 rounded-xl border border-cream-200">
              {matches.map((match) => (
                <li
                  key={match.participant_id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-charcoal-800">{slot(match)}</span>
                  <span className="shrink-0 text-charcoal-500">
                    {match.participant_code} · {formatLongDate(match.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
