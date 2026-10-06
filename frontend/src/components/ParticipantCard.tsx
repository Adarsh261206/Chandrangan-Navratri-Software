import { Link } from 'react-router-dom'
import { Avatar } from './ui/Avatar'
import { Badge } from './ui/Card'
import { IconChevronRight } from './ui/Icons'
import type { Participant } from '../types'
import { PRIZE_EMOJI, PRIZE_LABELS } from '../utils/format'

export function ParticipantCard({ participant }: { participant: Participant }) {
  return (
    <Link
      to={`/admin/participants/${participant.id}`}
      className="focus-ring card flex items-center gap-3 p-3 transition-shadow hover:shadow-card-hover sm:gap-4 sm:p-4"
    >
      <Avatar src={participant.photo_thumb} name={participant.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold text-charcoal-900">{participant.name}</p>
          <Badge tone="maroon" className="shrink-0">
            {participant.participant_code}
          </Badge>
        </div>
        <p className="mt-1 truncate text-sm text-charcoal-500">{participant.age_group_name}</p>
        <p className="mt-0.5 text-sm font-semibold text-maroon-700">
          {PRIZE_EMOJI[participant.prize_position]} {PRIZE_LABELS[participant.prize_position]}
        </p>
      </div>
      <span className="flex shrink-0 items-center gap-0.5 self-stretch text-xs font-semibold text-charcoal-500">
        <span className="hidden sm:inline">View Details</span>
        <IconChevronRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
