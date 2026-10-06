import { IconCalendar } from './ui/Icons'
import type { EventDay } from '../types'
import { cn } from '../utils/cn'

interface DaySelectorProps {
  days: EventDay[]
  value: number
  onChange: (dayId: number) => void
  loading?: boolean
  /** Small header above the chips (e.g. "Select day"). */
  label?: string
}

/** Format: "11 Oct" */
function shortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function DaySelector({ days, value, onChange, loading = false, label }: DaySelectorProps) {
  if (loading) {
    return (
      <div className="-mx-1 flex gap-2 overflow-hidden px-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-cream-200" />
        ))}
      </div>
    )
  }

  if (days.length === 0) return null

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-charcoal-500">
        <IconCalendar className="h-3.5 w-3.5" aria-hidden="true" />
        {label ?? 'Navratri day'}
      </p>
      <div
        role="tablist"
        aria-label="Select Navratri day"
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
      >
        {days.map((day) => {
          const active = day.id === value
          return (
            <button
              key={day.id}
              role="tab"
              aria-selected={active}
              type="button"
              disabled={!day.is_active}
              onClick={() => onChange(day.id)}
              className={cn(
                'focus-ring flex min-h-11 shrink-0 snap-start flex-col items-center justify-center rounded-full border px-4 py-1.5 text-center transition-colors',
                active
                  ? 'border-maroon-700 bg-maroon-700 text-white shadow-card'
                  : 'border-cream-300 bg-white text-charcoal-700 hover:bg-cream-100',
                !day.is_active && 'cursor-not-allowed opacity-50'
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                {day.label}
                {day.is_today ? (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none',
                      active ? 'bg-white/20 text-white' : 'bg-gold-400/25 text-gold-900'
                    )}
                  >
                    Today
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium leading-tight',
                  active ? 'text-white/80' : 'text-charcoal-500'
                )}
              >
                {shortDate(day.date)} · {day.weekday}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
