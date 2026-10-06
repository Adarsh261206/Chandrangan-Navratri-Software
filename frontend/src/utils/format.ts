import type { PrizePosition } from '../types'

export const PRIZE_LABELS: Record<PrizePosition, string> = {
  1: '1st Prize',
  2: '2nd Prize',
  3: '3rd Prize',
}

export const PRIZE_LONG_LABELS: Record<PrizePosition, string> = {
  1: 'First Prize',
  2: 'Second Prize',
  3: 'Third Prize',
}

export const PRIZE_EMOJI: Record<PrizePosition, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export function prizeLabel(position: number): string {
  return PRIZE_LABELS[position as PrizePosition] ?? 'Prize'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatLongDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]?.charAt(0) ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}
