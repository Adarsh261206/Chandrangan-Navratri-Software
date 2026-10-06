import type { DuplicateLevel, DuplicateMatch, PrizePosition } from '../types'

/**
 * Picks the match that is most relevant to the slot being saved:
 * - exact: the registration in the same group and same prize
 * - group: a registration in the same group (different prize)
 * - other: a registration in a different group
 * Falls back to the first match when no exact fit exists.
 */
export function pickPrimaryMatch(
  level: DuplicateLevel,
  matches: DuplicateMatch[],
  target: { ageGroupId: number | null; prize: PrizePosition }
): DuplicateMatch | null {
  if (matches.length === 0) return null

  if (level === 'exact') {
    return (
      matches.find(
        (match) =>
          match.age_group_id === target.ageGroupId && match.prize_position === target.prize
      ) ??
      matches.find((match) => match.age_group_id === target.ageGroupId) ??
      matches[0]
    )
  }

  if (level === 'group') {
    return (
      matches.find((match) => match.age_group_id === target.ageGroupId) ?? matches[0]
    )
  }

  if (level === 'other') {
    return (
      matches.find((match) => match.age_group_id !== target.ageGroupId) ?? matches[0]
    )
  }

  return matches[0]
}
