export type LostFoundReportType = 'lost' | 'found'
export type LostFoundStatus = 'open' | 'potential_match' | 'under_review' | 'recovered' | 'closed' | 'rejected'
export type LostFoundCategory = 'electronics' | 'id_cards' | 'books_stationery' | 'bags' | 'clothing' | 'keys' | 'accessories' | 'other'
export type LostFoundMatchStatus = 'suggested' | 'accepted' | 'rejected' | 'resolved'
export type TicketType = 'complaint' | 'service_request'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TicketStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'awaiting_information' | 'resolved' | 'closed' | 'rejected'
export type TicketMessageVisibility = 'public' | 'internal'
export type FeedbackStatus = 'submitted' | 'under_review' | 'planned' | 'implemented' | 'declined' | 'closed'

export interface LostFoundItem {
  id: string
  is_mine?: boolean
  report_type: LostFoundReportType
  title: string
  description: string
  category: LostFoundCategory
  location_description: string | null
  occurred_at: string | null
  image_paths: string[]
  status: LostFoundStatus
  resolved_at: string | null
  created_at: string
}

export interface LostFoundMatch {
  id: string
  lost_item_id: string
  found_item_id: string
  suggested_by: string
  status: LostFoundMatchStatus
  created_at: string
  lost_item?: Pick<LostFoundItem, 'id' | 'title' | 'description' | 'category' | 'occurred_at' | 'location_description'>
  found_item?: Pick<LostFoundItem, 'id' | 'title' | 'description' | 'category' | 'occurred_at' | 'location_description'>
}

export interface SupportTicket {
  id: string
  reference_code: string
  ticket_type: TicketType
  service_id: string | null
  category: string
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  assigned_to: string | null
  is_anonymous: boolean
  location_description: string | null
  contact_method: string | null
  resolution_summary: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  service?: Pick<CampusService, 'name' | 'category'> | null
}

export interface SupportTicketHistory {
  id: string
  ticket_id: string
  actor_id: string | null
  old_status: TicketStatus | null
  new_status: TicketStatus | null
  old_assignee: string | null
  new_assignee: string | null
  comment: string | null
  created_at: string
}

export interface SupportTicketMessage {
  id: string
  ticket_id: string
  sender_id: string | null
  message: string
  visibility: TicketMessageVisibility
  attachment_paths: string[]
  created_at: string
}

export interface SupportTicketInternalNote {
  id: string
  ticket_id: string
  author_id: string
  note: string
  created_at: string
}

export interface FeedbackSubmission {
  id: string
  submitted_by: string
  category: 'general' | 'academic' | 'facilities' | 'events' | 'website_app' | 'services'
  title: string
  message: string
  rating: number | null
  is_anonymous: boolean
  status: FeedbackStatus
  admin_response: string | null
  created_at: string
  updated_at: string
}

export interface CampusService {
  id: string
  name: string
  slug: string
  category: 'it_support' | 'library_assistance' | 'facilities' | 'student_support' | 'academic_assistance' | 'accessibility' | 'general'
  description: string
  location_description: string | null
  opening_hours: string | null
  contact_information: string | null
  service_type: 'information' | 'request'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LostFoundInput {
  report_type: LostFoundReportType
  title: string
  description: string
  category: LostFoundCategory
  location_description?: string
  occurred_at?: string
  contact_method: string
  images?: File[]
}

export interface SupportTicketInput {
  ticket_type: TicketType
  service_id?: string
  category: string
  subject: string
  description: string
  priority: TicketPriority
  is_anonymous: boolean
  location_description?: string
  contact_method?: string
  attachments?: File[]
}
