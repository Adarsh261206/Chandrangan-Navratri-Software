import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type AlertTone = 'info' | 'warning' | 'danger' | 'success'

const tones: Record<AlertTone, string> = {
  info: 'border-maroon-100 bg-maroon-50 text-maroon-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone
  title?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-4 py-3', tones[tone], className)}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-base leading-none">
          {tone === 'danger' ? '⚠' : tone === 'warning' ? '⚠' : tone === 'success' ? '✓' : 'ℹ'}
        </span>
        <div className="min-w-0 flex-1">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {children ? <div className={cn('text-sm', title && 'mt-0.5')}>{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
