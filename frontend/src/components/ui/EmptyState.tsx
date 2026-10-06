import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({ title, description, icon, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-cream-100/60 text-center',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-maroon-700 shadow-card">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-charcoal-800 sm:text-base">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-charcoal-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4 w-full max-w-xs">{action}</div> : null}
    </div>
  )
}
