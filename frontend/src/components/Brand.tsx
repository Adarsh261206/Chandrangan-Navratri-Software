import { cn } from '../utils/cn'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-xl bg-maroon-800 text-gold-300 shadow-card',
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-full w-full p-1.5">
        <path
          d="M32 12c1.8 6.2 5.6 10 11.8 11.8C37.6 25.6 33.8 29.4 32 35.6c-1.8-6.2-5.6-10-11.8-11.8C26.4 22 30.2 18.2 32 12Z"
          fill="currentColor"
        />
        <path
          d="M32 30c1.5 5.2 4.7 8.4 9.9 9.9-5.2 1.5-8.4 4.7-9.9 9.9-1.5-5.2-4.7-8.4-9.9-9.9 5.2-1.5 8.4-4.7 9.9-9.9Z"
          fill="#F0E1AE"
          opacity=".92"
        />
        <circle cx="32" cy="32" r="3.4" fill="#6E1124" />
      </svg>
    </span>
  )
}

export function Brand({
  inverted = false,
  className,
}: {
  inverted?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark className={inverted ? 'h-9 w-9 bg-maroon-950/60' : 'h-9 w-9'} />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            'truncate text-[11px] font-bold uppercase tracking-[0.14em]',
            inverted ? 'text-gold-300' : 'text-gold-600'
          )}
        >
          ChandranganxSumit
        </p>
        <p
          className={cn(
            'truncate text-sm font-extrabold uppercase tracking-wide',
            inverted ? 'text-white' : 'text-maroon-800'
          )}
        >
          Navratrotsav
        </p>
      </div>
    </div>
  )
}
