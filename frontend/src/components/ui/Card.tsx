import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-charcoal-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-charcoal-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export type BadgeTone = 'maroon' | 'gold' | 'green' | 'gray' | 'red'

const badgeTones: Record<BadgeTone, string> = {
  maroon: 'bg-maroon-50 text-maroon-700 border-maroon-100',
  gold: 'bg-amber-50 text-amber-800 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  gray: 'bg-cream-100 text-charcoal-600 border-cream-300',
  red: 'bg-red-50 text-red-700 border-red-200',
}

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
