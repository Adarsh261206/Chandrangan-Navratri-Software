export type PrizePosition = 1 | 2 | 3

export interface AgeGroup {
  id: number
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string | null
  counts: Record<'1' | '2' | '3', number>
  total: number
}

export interface EventDay {
  id: number
  label: string
  date: string
  weekday: string
  is_active: boolean
  is_today: boolean
  winner_count?: number
}

export interface EventDaysPayload {
  days: EventDay[]
  today_id: number | null
}

export interface RegistrationHistoryItem {
  participant_id: number
  participant_code: string
  age_group_name: string
  prize_position: PrizePosition
  day_id: number
  day_label: string
  created_at: string
  is_current: boolean
}

export interface Participant {
  id: number
  participant_code: string
  name: string
  day_id: number
  day_label: string | null
  day_date: string | null
  age_group_id: number
  age_group_name: string | null
  prize_position: PrizePosition
  photo: string | null
  photo_thumb: string | null
  created_at: string | null
  photo_width?: number | null
  photo_height?: number | null
  history?: RegistrationHistoryItem[]
  move_targets?: PrizePosition[]
  occupied_slots?: Partial<Record<PrizePosition, number>>
}

export type DuplicateLevel = 'none' | 'exact' | 'group' | 'other'

export interface DuplicateMatch {
  participant_id: number
  participant_code: string
  name: string
  day_id: number
  day_label: string
  day_date: string
  age_group_id: number
  age_group_name: string
  prize_position: PrizePosition
  created_at: string
}

export interface DuplicateCheck {
  level: DuplicateLevel
  matches: DuplicateMatch[]
}

export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface Paginated<T> {
  items: T[]
  pagination: Pagination
}

export interface RecentParticipant {
  id: number
  participant_code: string
  name: string
  age_group_name: string
  day_label: string | null
  prize_position: PrizePosition
  photo_thumb: string | null
  created_at: string
}

export interface DashboardStats {
  total_participants: number
  today_registrations: number
  total_age_groups: number
  prizes: Record<'1' | '2' | '3', number>
  age_groups: AgeGroup[]
  recent: RecentParticipant[]
  current_day: EventDay
  days: EventDay[]
}

export interface PublicWinner {
  name: string
  photo: string | null
  photo_thumb: string | null
  registered_on: string
}

export interface PublicAgeGroup {
  id: number
  name: string
  total: number
  prizes: Record<'1' | '2' | '3', PublicWinner[]>
}

export interface PublicResults {
  days: EventDay[]
  selected_day: number
  age_groups: PublicAgeGroup[]
}

export type AdminRole = 'super_admin' | 'admin'

export interface AdminUser {
  id: number
  username: string
  role: AdminRole
}
