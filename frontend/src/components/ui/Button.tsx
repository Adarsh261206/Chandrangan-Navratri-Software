import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-maroon-700 text-white hover:bg-maroon-800 active:bg-maroon-900 shadow-card disabled:bg-maroon-200',
  secondary:
    'border border-cream-300 bg-white text-charcoal-800 hover:bg-cream-100 active:bg-cream-200 disabled:text-charcoal-500',
  ghost: 'text-charcoal-700 hover:bg-cream-200/70 active:bg-cream-200 disabled:text-charcoal-500',
  danger:
    'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 shadow-card disabled:bg-red-200',
  gold: 'bg-gold-500 text-maroon-950 hover:bg-gold-600 active:bg-gold-700 shadow-card disabled:bg-gold-200',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm gap-1.5',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-12 px-5 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex select-none items-center justify-center rounded-xl font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      <span className="truncate">{children}</span>
      {!loading && iconRight ? iconRight : null}
    </button>
  )
}
