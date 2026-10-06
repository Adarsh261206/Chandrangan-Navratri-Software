import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Hide the default close button (custom headers may provide their own). */
  hideClose?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  // Keep the latest onClose in a ref so the focus-trap effect only runs when
  // `open` changes. Depending on `onClose` directly made the effect re-run on
  // every keystroke (inline handlers are new identities each render), which
  // stole focus from the input and dropped it on the close button.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const { style } = document.body
    const previousOverflow = style.overflow
    style.overflow = 'hidden'

    // Focus the panel itself (not a button) so typing is never interrupted.
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus()
    }, 30)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown, true)
      style.overflow = previousOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-charcoal-900/45"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col animate-sheet-up rounded-t-2xl bg-white shadow-sheet focus:outline-none sm:animate-scale-in sm:rounded-2xl sm:shadow-card-hover',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl'
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-cream-300 sm:hidden"
        />
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="text-lg font-semibold text-charcoal-900">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-charcoal-600">
                  {description}
                </p>
              ) : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="focus-ring -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-charcoal-500 hover:bg-cream-100"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.22 5.22Z" />
                </svg>
              </button>
            ) : null}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="safe-bottom border-t border-cream-200 bg-white px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
