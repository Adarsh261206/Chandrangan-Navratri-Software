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

export interface RegistrationHistoryItem {
  participant_id: number
  participant_code: string
  age_group_name: string
  prize_position: PrizePosition
  created_at: string
  is_current: boolean
}

export interface Participant {
  id: number
  participant_code: string
  name: string
  age_group_id: number
  age_group_name: string | null
  prize_position: PrizePosition
  photo: string | null
  photo_thumb: string | null
  created_at: string | null
  photo_width?: number | null
  photo_height?: number | null
  history?: RegistrationHistoryItem[]
}

export type DuplicateLevel = 'none' | 'exact' | 'group' | 'other'

export interface DuplicateMatch {
  participant_id: number
  participant_code: string
  name: string
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

export interface AdminUser {
  id: number
  username: string
}
