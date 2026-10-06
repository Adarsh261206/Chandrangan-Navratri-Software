import { useCallback, useState } from 'react'
import { api, ApiError } from '../services/api'
import { useToast } from './useToast'
import { PRIZE_LONG_LABELS } from '../utils/format'
import type { PrizePosition } from '../types'

interface UsePrizeMoveOptions {
  dayId: number
  ageGroupId: number | null
  /** Refresh the caller's data after a successful move. */
  onChanged: () => void | Promise<void>
}

/**
 * Swap/move the single winner of a (day, group, prize) section with the
 * neighbouring section. Empty target = plain move, occupied = swap.
 */
export function usePrizeMove({ dayId, ageGroupId, onChanged }: UsePrizeMoveOptions) {
  const toast = useToast()
  const [moving, setMoving] = useState(false)

  const move = useCallback(
    async (prize: PrizePosition, direction: 'up' | 'down') => {
      const target = direction === 'up' ? prize - 1 : prize + 1
      if (moving || ageGroupId === null || target < 1 || target > 3) return

      setMoving(true)
      try {
        // The public results payload never exposes ids, so look the winner up.
        const slot = await api.participants.list({
          day_id: dayId,
          age_group_id: ageGroupId,
          prize_position: prize,
          per_page: 1,
        })
        const winner = slot.items[0]
        if (!winner) {
          toast.error('No winner in this section.')
          return
        }

        const result = await api.participants.move(winner.id, target as PrizePosition)
        const from = PRIZE_LONG_LABELS[prize]
        const to = PRIZE_LONG_LABELS[target as PrizePosition]
        toast.success('Prize updated', {
          description: result.swapped_with
            ? `${result.participant.name} → ${to} · ${result.swapped_with.name} → ${from}`
            : `${result.participant.name} → ${to}`,
        })
        await onChanged()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Could not move this winner. Please try again.'
        )
      } finally {
        setMoving(false)
      }
    },
    [ageGroupId, dayId, moving, onChanged, toast]
  )

  return { moving, move }
}
