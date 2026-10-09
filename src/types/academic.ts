export type AcademicPeriodStatus = 'upcoming' | 'active' | 'completed' | 'archived'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface AcademicPeriod {
  id: string
  name: string
  start_date: string
  end_date: string
  semester: number | null
  status: AcademicPeriodStatus
}

export interface AcademicSection {
  id: string
  department: string
  semester: number
  section_name: string
  academic_period_id: string
  academic_year: string
  capacity: number | null
  status: 'active' | 'archived'
}

export interface AcademicSubject {
  id: string
  subject_code: string
  subject_name: string
  branch_id: string
  semester: number
  description: string | null
  subject_type: string
  credits: number
  branch: { name: string; code: string }
}

export interface EnrolledSubject {
  id: string
  subject_id: string
  academic_period_id: string
  academic_year: string
  semester: number
  section: string
  enrollment_status: 'active' | 'completed' | 'dropped'
  subject: AcademicSubject
}

export interface TimetableEntry {
  id: string
  subject_id: string
  subject_code: string
  subject_name: string
  faculty_id: string
  faculty_name: string | null
  section: string
  department: string
  semester: number
  day_of_week: string
  start_time: string
  end_time: string
  room: string | null
  building: string | null
  class_type: string
  status?: 'active' | 'cancelled' | 'archived'
}

export interface AttendanceSummary {
  subject_id: string
  subject_code: string
  subject_name: string
  attended: number
  eligible: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  percentage: number | null
  threshold: number
  warning_threshold: number
  critical_threshold: number
}

export interface AttendanceTrendPoint {
  month: string
  attended: number
  eligible: number
  percentage: number | null
}

export interface AcademicAttendanceAnalytics {
  subject_id: string
  subject_code: string
  subject_name: string
  active_students: number
  completed_sessions: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  recorded_attendance: number | null
}

export interface FacultyAssignment {
  id: string
  subject_id: string
  academic_period_id: string
  academic_year: string
  semester: number
  section: string
  subject: Pick<AcademicSubject, 'subject_code' | 'subject_name'>
  period: Pick<AcademicPeriod, 'name' | 'status'>
  status: 'active' | 'completed' | 'archived'
  faculty_name?: string
}

export interface AttendanceRosterEntry {
  student_id: string
  full_name: string
  status: AttendanceStatus | null
  remarks: string | null
}

export interface AttendanceSession {
  id: string
  subject_id: string
  academic_period_id: string
  session_date: string
  section: string
  topic: string | null
  status: 'open' | 'completed' | 'cancelled'
  created_at: string
}
