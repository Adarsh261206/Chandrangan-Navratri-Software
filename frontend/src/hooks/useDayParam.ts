import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EventDay } from '../types'

const STORAGE_KEY = 'navratrotsav.selected_day'

/** Last day the admin worked in (survives navigation between admin pages). */
function readStoredDay(): number | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const value = Number(raw)
    return Number.isInteger(value) && value >= 1 && value <= 9 ? value : null
  } catch {
    return null
  }
}

function storeDay(dayId: number): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(dayId))
  } catch {
    // Storage unavailable (private mode) — day still works for this page.
  }
}

function paramDayOf(params: URLSearchParams): number | null {
  const value = Number(params.get('day'))
  return Number.isInteger(value) && value >= 1 && value <= 9 ? value : null
}

export interface DayParamOptions {
  /**
   * Remember the last selected day in sessionStorage so switching days once
   * keeps every admin page (Home, Names, Age group, Results) on that day.
   * Disable for the public results page, which should stay URL-driven.
   */
  persist?: boolean
}

/**
 * Selected Navratri day. Resolution order: URL `?day=N` → last used day
 * (when persisting) → today's event day → Day 1.
 */
export function useDayParam(
  days: EventDay[],
  todayId: number | null,
  options: DayParamOptions = {}
): [number, (dayId: number) => void] {
  const persist = options.persist ?? true
  const [searchParams, setSearchParams] = useSearchParams()

  const [selected, setSelected] = useState<number>(() => {
    const fromUrl = paramDayOf(searchParams)
    if (fromUrl !== null) return fromUrl
    const stored = persist ? readStoredDay() : null
    return stored ?? todayId ?? 1
  })

  // When the day list arrives, honour ?day= or fall back to the last used day.
  useEffect(() => {
    if (days.length === 0) return
    const fromUrl = paramDayOf(searchParams)
    if (fromUrl !== null) {
      setSelected(fromUrl)
      if (persist) storeDay(fromUrl)
      return
    }
    const stored = persist ? readStoredDay() : null
    setSelected(stored ?? todayId ?? 1)
    // Only re-resolve when the list/today value changes, not on every param edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, todayId])

  // Remember deep-linked days too (?day=8 opened directly), so later navigation
  // without a param comes back to the same day instead of resetting to Day 1.
  useEffect(() => {
    const fromUrl = paramDayOf(searchParams)
    if (persist && fromUrl !== null) storeDay(fromUrl)
  }, [persist, searchParams])

  const select = useCallback(
    (dayId: number) => {
      setSelected(dayId)
      if (persist) storeDay(dayId)
      const next = new URLSearchParams(searchParams)
      next.set('day', String(dayId))
      setSearchParams(next, { replace: true })
    },
    [persist, searchParams, setSearchParams]
  )

  return [selected, select]
}
