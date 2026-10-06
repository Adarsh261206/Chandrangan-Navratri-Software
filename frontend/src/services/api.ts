import type {
  AgeGroup,
  AdminUser,
  DashboardStats,
  DuplicateCheck,
  EventDaysPayload,
  Paginated,
  Participant,
  PrizePosition,
  PublicResults,
} from '../types'

export interface ApiErrorPayload {
  success: false
  message: string
  code: string
  errors?: Record<string, string>
  level?: string
  matches?: unknown[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>
  readonly payload: unknown

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors: Record<string, string> = {},
    payload: unknown = null
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.payload = payload
  }

  get isNetwork(): boolean {
    return this.code === 'network_error'
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  get duplicateLevel(): string | null {
    return this.code.startsWith('duplicate_') ? this.code.replace('duplicate_', '') : null
  }
}

let csrfToken: string | null = null

export function setCsrfToken(token: string | null): void {
  csrfToken = token
}

export function getCsrfToken(): string | null {
  return csrfToken
}

const API_BASE = '/api'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (method !== 'GET' && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'Could not reach the server. Please check your connection and try again.',
      0,
      'network_error'
    )
  }

  let payload: unknown = null
  const text = await response.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as Partial<ApiErrorPayload>
    const message =
      typeof errorPayload.message === 'string' && errorPayload.message
        ? errorPayload.message
        : 'Something went wrong. Please try again.'
    const apiError = new ApiError(
      message,
      response.status,
      typeof errorPayload.code === 'string' ? errorPayload.code : 'error',
      errorPayload.errors ?? {},
      payload
    )

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    throw apiError
  }

  const successPayload = (payload ?? {}) as { data?: T }
  return (successPayload.data ?? null) as T
}

function queryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const result = search.toString()
  return result ? `?${result}` : ''
}

export interface AuthSession {
  user: AdminUser
  csrf: string
}

export interface CreateParticipantResult {
  participant: Participant
  duplicate: DuplicateCheck | null
  idempotent: boolean
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<AuthSession>('/auth/login', {
        method: 'POST',
        body: { username, password },
      }),
    logout: () => request<null>('/auth/logout', { method: 'POST' }),
    me: () => request<AuthSession>('/auth/me'),
    changePassword: (current_password: string, new_password: string) =>
      request<null>('/auth/change-password', {
        method: 'POST',
        body: { current_password, new_password },
      }),
  },
  dashboard: {
    stats: () => request<DashboardStats>('/dashboard/stats'),
  },
  eventDays: {
    list: () => request<EventDaysPayload>('/event-days'),
    updateDates: (days: Record<number, string>) =>
      request<EventDaysPayload>('/event-days', { method: 'PUT', body: { days } }),
  },
  ageGroups: {
    list: () => request<{ items: AgeGroup[] }>('/age-groups'),
    get: (id: number) => request<AgeGroup>(`/age-groups/${id}`),
    create: (input: { name: string; description?: string; is_active?: boolean }) =>
      request<AgeGroup>('/age-groups', { method: 'POST', body: input }),
    update: (
      id: number,
      input: { name?: string; description?: string; is_active?: boolean }
    ) => request<AgeGroup>(`/age-groups/${id}`, { method: 'PUT', body: input }),
    remove: (id: number) => request<null>(`/age-groups/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) =>
      request<{ items: AgeGroup[] }>('/age-groups/reorder', { method: 'POST', body: { ids } }),
  },
  participants: {
    list: (params: {
      page?: number
      per_page?: number
      age_group_id?: number
      prize_position?: number
      day_id?: number
    }) => request<Paginated<Participant>>(`/participants${queryString(params)}`),
    search: (q: string, page = 1, perPage = 20, dayId?: number) =>
      request<Paginated<Participant>>(
        `/participants/search${queryString({ q, page, per_page: perPage, day_id: dayId })}`
      ),
    checkDuplicate: (
      name: string,
      ageGroupId?: number,
      prizePosition?: number,
      dayId?: number,
      signal?: AbortSignal
    ) =>
      request<DuplicateCheck>(
        `/participants/check-duplicate${queryString({
          name,
          age_group_id: ageGroupId,
          prize_position: prizePosition,
          day_id: dayId,
        })}`,
        { signal }
      ),
    get: (id: number) => request<Participant>(`/participants/${id}`),
    remove: (id: number) => request<null>(`/participants/${id}`, { method: 'DELETE' }),
    create: (formData: FormData) =>
      request<CreateParticipantResult>('/participants', { method: 'POST', formData }),
    move: (id: number, prizePosition: PrizePosition) =>
      request<{ participant: Participant; swapped_with: { name: string; prize_position: PrizePosition } | null }>(
        `/participants/${id}/move`,
        { method: 'POST', body: { prize_position: prizePosition } }
      ),
  },
  results: {
    public: (ageGroupId?: number, dayId?: number) =>
      request<PublicResults>(
        `/results${queryString({ age_group_id: ageGroupId, day_id: dayId })}`
      ),
  },
}
