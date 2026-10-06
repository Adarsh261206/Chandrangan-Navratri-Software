import { useState } from 'react'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Larger display photo can be loaded on demand (detail views). */
  eager?: boolean
}

const sizes = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl',
  xl: 'h-28 w-28 sm:h-36 sm:w-36 text-3xl sm:text-4xl',
}

export function Avatar({ src, name, size = 'md', className, eager = false }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 text-cream-100',
        'flex items-center justify-center font-bold',
        sizes[size],
        className
      )}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={name}
          width={size === 'xl' ? 288 : size === 'lg' ? 80 : 48}
          height={size === 'xl' ? 288 : size === 'lg' ? 80 : 48}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="select-none">{initials(name)}</span>
      )}
    </div>
  )
}
