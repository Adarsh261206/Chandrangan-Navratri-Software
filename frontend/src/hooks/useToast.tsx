import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../utils/cn'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastItem extends Required<Pick<ToastOptions, 'type'>> {
  id: number
  message: string
  description?: string
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  toast: {
    success: (message: string, options?: ToastOptions) => void
    error: (message: string, options?: ToastOptions) => void
    info: (message: string, options?: ToastOptions) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (message: string, options: ToastOptions = {}) => {
      const id = nextId.current++
      const item: ToastItem = {
        id,
        message,
        type: options.type ?? 'info',
        description: options.description,
        action: options.action,
      }
      setItems((current) => [...current.slice(-2), item])
      window.setTimeout(() => dismiss(id), options.duration ?? 3600)
    },
    [dismiss]
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (message, options) => show(message, { ...options, type: 'success' }),
        error: (message, options) => show(message, { ...options, type: 'error' }),
        info: (message, options) => show(message, { ...options, type: 'info' }),
      },
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[80] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:top-4 sm:right-4 sm:left-auto sm:items-end sm:px-0"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              'pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl border px-4 py-3 shadow-card-hover sm:w-80',
              item.type === 'success' && 'border-emerald-200 bg-white',
              item.type === 'error' && 'border-red-200 bg-white',
              item.type === 'info' && 'border-cream-300 bg-white'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                item.type === 'success' && 'bg-emerald-600',
                item.type === 'error' && 'bg-red-600',
                item.type === 'info' && 'bg-maroon-700'
              )}
            >
              {item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal-900">{item.message}</p>
              {item.description ? (
                <p className="mt-0.5 break-words text-sm text-charcoal-600">{item.description}</p>
              ) : null}
              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick()
                    dismiss(item.id)
                  }}
                  className="focus-ring mt-2 rounded-lg px-2 py-1 text-sm font-semibold text-maroon-700 hover:bg-maroon-50"
                >
                  {item.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className="focus-ring -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-charcoal-500 hover:bg-cream-100"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.22 5.22Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue['toast'] {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context.toast
}
