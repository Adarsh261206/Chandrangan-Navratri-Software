import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-charcoal-800"
      >
        {label}
        {required ? <span className="ml-0.5 text-maroon-600">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-charcoal-500">{hint}</p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-xl border bg-white px-4 text-base text-charcoal-900 placeholder:text-charcoal-500 ' +
  'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-cream-100 disabled:text-charcoal-500'

function stateClass(error?: string): string {
  return error
    ? 'border-red-300 focus:ring-red-500 focus:border-red-400'
    : 'border-cream-300 focus:ring-maroon-600 focus:border-maroon-500'
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

export function Input({ className, error, id, inputRef, ...rest }: InputProps) {
  return (
    <input
      id={id}
      ref={inputRef}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id ?? ''}-error` : undefined}
      className={cn(controlClass, 'min-h-12', stateClass(error), className)}
      {...rest}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export function Textarea({ className, error, id, ...rest }: TextareaProps) {
  return (
    <textarea
      id={id}
      aria-invalid={error ? true : undefined}
      className={cn(controlClass, 'min-h-24 py-3', stateClass(error), className)}
      {...rest}
    />
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export function Select({ className, error, id, children, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlClass,
          'min-h-12 appearance-none pr-10',
          stateClass(error),
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
}
