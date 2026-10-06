import type { DuplicateLevel, DuplicateMatch, PrizePosition } from '../types'

/**
 * Picks the match that is most relevant to the slot being saved:
 * - exact: same day, same group and same prize
 * - group: same day, same group (different prize)
 * - other: a different day (or a different group on this day)
 * Falls back to the first match when no exact fit exists.
 */
export function pickPrimaryMatch(
  level: DuplicateLevel,
  matches: DuplicateMatch[],
  target: { ageGroupId: number | null; prize: PrizePosition; dayId?: number | null }
): DuplicateMatch | null {
  if (matches.length === 0) return null

  const sameDay = (match: DuplicateMatch) =>
    target.dayId == null || match.day_id === target.dayId

  if (level === 'exact') {
    return (
      matches.find(
        (match) =>
          sameDay(match) &&
          match.age_group_id === target.ageGroupId &&
          match.prize_position === target.prize
      ) ??
      matches.find((match) => sameDay(match) && match.age_group_id === target.ageGroupId) ??
      matches[0]
    )
  }

  if (level === 'group') {
    return (
      matches.find((match) => sameDay(match) && match.age_group_id === target.ageGroupId) ??
      matches[0]
    )
  }

  if (level === 'other') {
    return (
      matches.find((match) => !sameDay(match) || match.age_group_id !== target.ageGroupId) ??
      matches[0]
    )
  }

  return matches[0]
}
