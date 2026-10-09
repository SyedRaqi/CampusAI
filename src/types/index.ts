export type UserRole = 'student' | 'faculty' | 'admin'

export interface Profile {
  id: string
  auth_user_id: string
  role: UserRole
  full_name: string
  usn?: string | null
  profile_photo?: string | null
  phone?: string | null
  department?: string | null
  semester?: string | number | null
  section?: string | null
  bio?: string | null
  created_at?: string
  updated_at?: string
}

export interface StudentProfile extends Profile {
  branch?: string | null
  roll_number?: string | null
  admission_year?: string | null
  skills?: string[] | null
  interests?: string[] | null
  github_url?: string | null
  linkedin_url?: string | null
}

export interface FacultyProfile extends Profile {
  employee_id?: string | null
  designation?: string | null
  subjects?: string[] | null
}

export interface AdminProfile extends Profile {
  employee_id?: string | null
  permissions?: string[] | null
}

export type EventCategory =
  | 'Technical'
  | 'Workshop'
  | 'Seminar'
  | 'Hackathon'
  | 'Cultural'
  | 'Sports'
  | 'Academic'
  | 'Club'
  | 'Placement'
  | 'Other'

export type EventStatus = 'draft' | 'published' | 'registration_closed' | 'completed' | 'cancelled'
export type RegistrationStatus = 'registered' | 'cancelled' | 'attended' | 'no_show'
export type TicketStatus = 'valid' | 'used' | 'cancelled'

export interface EventRecord {
  id: string
  title: string
  slug: string
  description: string
  short_description: string
  category: EventCategory
  organizer_name: string
  organizer_profile_id?: string | null
  venue: string
  event_date: string
  start_time: string
  end_time: string
  registration_deadline: string
  capacity: number
  banner_image_url?: string | null
  status: EventStatus
  is_featured: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
  registration_count?: number
  is_demo?: boolean
}

export interface EventRegistration {
  id: string
  event_id: string
  profile_id: string
  registration_number: string
  registered_at: string
  status: RegistrationStatus
  attended: boolean
  attended_at?: string | null
  created_at?: string
  updated_at?: string
  event?: EventRecord | null
}

export interface EventTicket {
  id: string
  registration_id: string
  ticket_code: string
  qr_payload: string
  issued_at: string
  verified_at?: string | null
  verified_by?: string | null
  status: TicketStatus
}

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  type: 'event_registration' | 'event_reminder' | 'event_cancelled' | 'event_updated' | 'ticket_issued'
    | 'internship_deadline' | 'application_updated' | 'interview_reminder' | 'internship_published'
    | 'attendance_warning' | 'academic_update' | 'class_reminder' | 'resource_published'
    | 'message' | 'mention' | 'club_join_approval' | 'club_invitation' | 'project_team_invitation'
    | 'club_activity' | 'team_task' | 'message_reaction' | 'message_reply'
    | 'support_update' | 'lost_found_update' | 'feedback_response' | 'announcement'
  related_event_id?: string | null
  is_read: boolean
  created_at: string
}

export type ResourceStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'
export type ResourceVisibility = 'students' | 'faculty' | 'all'
export type ResourceType =
  | 'notes'
  | 'question_paper'
  | 'lab_manual'
  | 'assignment'
  | 'presentation'
  | 'study_material'
  | 'reference_document'
  | 'ebook'
  | 'syllabus'
  | 'important_questions'
  | 'other'

export interface Branch {
  id: string
  code: string
  name: string
  is_demo: boolean
  is_active: boolean
}

export interface Semester {
  number: number
  label: string
}

export interface Subject {
  id: string
  subject_code: string
  subject_name: string
  branch_id: string
  semester: number
  description: string | null
  credits?: number
  subject_type?: 'theory' | 'practical' | 'elective' | 'project' | 'seminar' | 'other'
  department?: string | null
  is_demo: boolean
  is_active: boolean
  branch?: Branch
}

export interface Resource {
  id: string
  title: string
  description: string | null
  resource_type: ResourceType | string
  subject_id: string
  branch_id: string
  semester: number
  section: string | null
  file_name: string
  file_type: string
  file_size: number
  thumbnail_url: string | null
  uploaded_by: string
  uploader_name?: string
  uploader_role: UserRole
  status: ResourceStatus
  visibility: ResourceVisibility
  download_count: number
  view_count: number
  save_count: number
  moderation_reason: string | null
  version: string
  replaces_resource_id: string | null
  created_at: string
  updated_at: string
  subject?: Subject
  is_bookmarked?: boolean
}

export interface ResourceBookmark {
  id: string
  resource_id: string
  user_id: string
  created_at: string
  resource?: Resource
}

export interface ResourceView {
  id: string
  resource_id: string
  user_id: string
  viewed_at: string
  resource?: Resource
}

export type ResourceReportReason = 'incorrect_content' | 'broken_file' | 'duplicate' | 'inappropriate' | 'other'
export type ResourceReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'

export interface ResourceReport {
  id: string
  resource_id: string
  reported_by: string
  reason: ResourceReportReason
  description: string | null
  status: ResourceReportStatus
  created_at: string
  resource?: Resource
}

export type WorkMode = 'remote' | 'hybrid' | 'on_site'
export type InternshipType = 'full_time' | 'part_time' | 'summer' | 'winter' | 'academic' | 'research'
export type InternshipStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'closed' | 'archived'
export type InternshipSourceType = 'admin_added' | 'faculty_added' | 'external_opportunity'
export type ApplicationStatus = 'saved' | 'applied' | 'shortlisted' | 'interview' | 'offer' | 'selected' | 'rejected' | 'withdrawn'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type InterviewType = 'online' | 'phone' | 'in_person' | 'technical' | 'hr' | 'other'

export interface Company {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  industry: string | null
  location: string | null
  is_demo: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Internship {
  id: string
  company_id: string
  role_title: string
  description: string
  short_description: string
  location: string
  work_mode: WorkMode
  internship_type: InternshipType
  duration: string
  duration_months: number
  stipend: number | null
  stipend_currency: string
  is_paid: boolean
  skills: string[]
  eligibility: string | null
  branch_id: string | null
  minimum_semester: number | null
  maximum_semester: number | null
  application_url: string | null
  official_source_url: string | null
  application_deadline: string | null
  start_date: string | null
  end_date: string | null
  status: InternshipStatus
  source_type: InternshipSourceType
  moderation_reason: string | null
  is_demo: boolean
  created_by: string
  created_at: string
  updated_at: string
  company?: Company
  branch?: Branch | null
  is_bookmarked?: boolean
  application_status?: ApplicationStatus | null
  matching_skills?: string[]
  skill_match_percent?: number
  is_eligible?: boolean
}

export interface InternshipApplication {
  id: string
  internship_id: string
  student_id: string
  applied_at: string | null
  status: ApplicationStatus
  notes: string | null
  interview_date: string | null
  interview_type: InterviewType | null
  interview_notes: string | null
  offer_date: string | null
  offer_start_date: string | null
  offer_duration: string | null
  outcome: string | null
  created_at: string
  updated_at: string
  internship?: Internship
}

export interface InternshipBookmark {
  id: string
  internship_id: string
  student_id: string
  created_at: string
  internship?: Internship
}

export interface StudentSkill {
  id: string
  student_id: string
  skill_name: string
  skill_level: SkillLevel
  created_at: string
  updated_at: string
}

export interface CareerPreferences {
  id: string
  student_id: string
  target_role: string | null
  preferred_industries: string[]
  preferred_locations: string[]
  preferred_work_modes: WorkMode[]
  preferred_internship_types: InternshipType[]
  preferred_branches: string[]
  expected_duration: string | null
  interests: string[]
  created_at: string
  updated_at: string
}

export interface CareerProfile {
  student_id: string
  career_goal: string | null
  github_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  resume_path: string | null
  resume_file_name: string | null
  updated_at: string
  skills?: StudentSkill[]
  preferences?: CareerPreferences | null
}

export type ClubStatus = 'draft' | 'pending_approval' | 'active' | 'suspended' | 'archived'
export type ClubMemberRole = 'member' | 'coordinator' | 'president' | 'vice_president' | 'secretary' | 'faculty_coordinator'
export type ClubMemberStatus = 'pending' | 'active' | 'rejected' | 'removed'
export type ConversationType = 'direct' | 'club' | 'project_team' | 'group'
export type MessageType = 'text' | 'image' | 'file' | 'system'

export interface Club {
  id: string; name: string; slug: string; description: string; category: string
  logo_url: string | null; cover_image_url: string | null
  faculty_coordinator_id: string | null; student_lead_id: string | null
  contact_email: string | null; meeting_schedule: string | null; location: string | null
  status: ClubStatus; is_demo: boolean; created_at: string; updated_at: string
  member_count?: number; is_member?: boolean; membership_status?: ClubMemberStatus | null
}

export interface ClubMember { id: string; club_id: string; user_id: string; role: ClubMemberRole; status: ClubMemberStatus; joined_at: string; full_name?: string }
export interface ClubActivity { id: string; club_id: string; title: string; description: string; activity_type: string; start_time: string; end_time: string | null; location: string | null; image_url: string | null; created_by: string; status: string; created_at: string }
export interface ClubPost { id: string; club_id: string; author_id: string; title: string; content: string; image_url: string | null; created_at: string; updated_at: string; author_name?: string }

export interface ProjectTeam { id: string; name: string; description: string; project_title: string; project_domain: string; owner_id: string; status: string; visibility: string; created_at: string; updated_at: string; member_count?: number; is_member?: boolean }
export interface ProjectTeamMember { id: string; team_id: string; user_id: string; role: string; joined_at: string; status: string; full_name?: string }
export interface ProjectTeamTask { id: string; team_id: string; title: string; description: string; assigned_to: string | null; priority: string; status: string; due_date: string | null; created_by: string; created_at: string; updated_at: string }

export interface Conversation { id: string; type: ConversationType; name: string | null; description: string | null; avatar_url: string | null; club_id: string | null; project_team_id: string | null; created_by: string; created_at: string; updated_at: string; unread_count?: number; last_message?: Message | null }
export interface ConversationMember { id: string; conversation_id: string; user_id: string; role: string; joined_at: string; last_read_at: string | null; muted: boolean; status: string; full_name?: string }
export interface Message { id: string; conversation_id: string; sender_id: string; content: string; message_type: MessageType; reply_to_id: string | null; attachment_url: string | null; attachment_name: string | null; attachment_type: string | null; attachment_size: number | null; created_at: string; updated_at: string; deleted_at: string | null; sender_name?: string; reactions?: { reaction: string; count: number; reacted: boolean }[] }
export interface MessageReport { id: string; message_id: string; reported_by: string; reason: string; description: string | null; status: string; reviewed_by: string | null; reviewed_at: string | null; created_at: string }

export type AuthContextValue = {
  user: { id: string } | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  signIn: (usn: string, password: string) => Promise<void>
  signUp: (fullName: string, usn: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
