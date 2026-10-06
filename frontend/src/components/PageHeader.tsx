import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowLeft } from './ui/Icons'
import { cn } from '../utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  backTo?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, backTo, backLabel, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-4 sm:mb-6', className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="focus-ring mb-2 inline-flex min-h-10 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900"
        >
          <IconArrowLeft className="h-4 w-4" />
          {backLabel ?? 'Back'}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-charcoal-900 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-charcoal-500 sm:text-base">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
