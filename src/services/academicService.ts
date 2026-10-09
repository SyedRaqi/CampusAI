import { supabase } from '../lib/supabase'
import type {
  AcademicPeriod,
  AcademicSection,
  AcademicAttendanceAnalytics,
  AcademicSubject,
  AttendanceRosterEntry,
  AttendanceSession,
  AttendanceStatus,
  AttendanceSummary,
  AttendanceTrendPoint,
  EnrolledSubject,
  FacultyAssignment,
  TimetableEntry,
} from '../types/academic'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getAcademicPeriods(): Promise<AcademicPeriod[]> {
  const { data, error } = await requireSupabase()
    .from('academic_periods')
    .select('id,name,start_date,end_date,semester,status')
    .order('start_date', { ascending: false })
  if (error) throw new Error('Unable to load academic periods.')
  return (data ?? []) as AcademicPeriod[]
}

export async function getActiveAcademicPeriod(semester?: number): Promise<AcademicPeriod | null> {
  let query = requireSupabase()
    .from('academic_periods')
    .select('id,name,start_date,end_date,semester,status')
    .eq('status', 'active')
  if (semester) query = query.or(`semester.eq.${semester},semester.is.null`)
  const { data, error } = await query.order('start_date', { ascending: false })
  if (error) throw new Error('Unable to load the active academic period.')
  const periods = (data ?? []) as AcademicPeriod[]
  return periods.find((period) => period.semester === semester) ?? periods.find((period) => period.semester === null) ?? periods[0] ?? null
}

export async function getAcademicCatalog(semester?: number): Promise<AcademicSubject[]> {
  let query = requireSupabase()
    .from('subjects')
    .select('id,subject_code,subject_name,branch_id,semester,description,subject_type,credits,branch:branches(name,code)')
    .eq('is_active', true)
    .eq('is_demo', false)
    .order('subject_name')
  if (semester) query = query.eq('semester', semester)
  const { data, error } = await query
  if (error) throw new Error('Unable to load the academic subject catalog.')
  return (data ?? []) as unknown as AcademicSubject[]
}

export async function getAcademicSubject(subjectId: string): Promise<AcademicSubject | null> {
  const { data, error } = await requireSupabase()
    .from('subjects')
    .select('id,subject_code,subject_name,branch_id,semester,description,subject_type,credits,branch:branches(name,code)')
    .eq('id', subjectId)
    .eq('is_active', true)
    .eq('is_demo', false)
    .maybeSingle()
  if (error) throw new Error('Unable to load this subject.')
  return data as unknown as AcademicSubject | null
}

export async function getMyEnrollments(): Promise<EnrolledSubject[]> {
  const { data, error } = await requireSupabase()
    .from('student_subjects')
    .select('id,subject_id,academic_period_id,academic_year,semester,section,enrollment_status,subject:subjects(id,subject_code,subject_name,branch_id,semester,description,subject_type,credits,branch:branches(name,code))')
    .eq('enrollment_status', 'active')
    .order('enrolled_at', { ascending: false })
  if (error) throw new Error('Unable to load your enrolled subjects.')
  return (data ?? []) as unknown as EnrolledSubject[]
}

export async function enrollInSubject(input: {
  userId: string
  semester: number
  section: string
  subjectId: string
}): Promise<void> {
  const client = requireSupabase()
  const period = await getActiveAcademicPeriod(input.semester)
  if (!period) throw new Error('There is no active academic period. Contact your academic administrator.')
  if (!input.section.trim()) throw new Error('Add your section to your profile before enrolling.')
  const { error } = await client.from('student_subjects').insert({
    student_id: input.userId,
    subject_id: input.subjectId,
    academic_period_id: period.id,
    academic_year: period.name,
    semester: input.semester,
    section: input.section.trim(),
    enrollment_status: 'active',
  })
  if (error) {
    if (error.code === '23505') throw new Error('You are already enrolled in this subject for the active period.')
    if (error.code === '42501') throw new Error('This subject is not available for your profile or academic period.')
    throw new Error('Unable to enroll in this subject.')
  }
}

export async function getMyTimetable(): Promise<TimetableEntry[]> {
  const { data, error } = await requireSupabase().rpc('get_my_timetable')
  if (error) throw new Error('Unable to load your timetable.')
  return (data ?? []) as TimetableEntry[]
}

export async function getMyAttendanceSummary(): Promise<AttendanceSummary[]> {
  const { data, error } = await requireSupabase().rpc('get_my_attendance_summary')
  if (error) throw new Error('Unable to load your attendance summary.')
  return (data ?? []) as AttendanceSummary[]
}

export async function getAcademicAttendanceAnalytics(): Promise<AcademicAttendanceAnalytics[]> {
  const { data, error } = await requireSupabase().rpc('get_academic_attendance_analytics')
  if (error) throw new Error('Unable to load academic attendance analytics.')
  return (data ?? []) as AcademicAttendanceAnalytics[]
}

export async function getMyAttendanceTrend(): Promise<AttendanceTrendPoint[]> {
  const { data, error } = await requireSupabase().rpc('get_my_attendance_trend')
  if (error) throw new Error('Unable to load your monthly attendance trend.')
  return (data ?? []) as AttendanceTrendPoint[]
}

export interface AttendanceSettings {
  recommended_threshold: number
  warning_threshold: number
  critical_threshold: number
  late_weight: number
  excused_counts_as_eligible: boolean
}

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const { data, error } = await requireSupabase()
    .from('academic_attendance_settings')
    .select('recommended_threshold,warning_threshold,critical_threshold,late_weight,excused_counts_as_eligible')
    .eq('singleton', true)
    .single()
  if (error) throw new Error('Unable to load attendance settings.')
  return data as AttendanceSettings
}

export async function updateAttendanceSettings(settings: AttendanceSettings): Promise<void> {
  if (![settings.recommended_threshold, settings.warning_threshold, settings.critical_threshold]
    .every((value) => Number.isFinite(value) && value >= 0 && value <= 100)
    || !Number.isFinite(settings.late_weight) || settings.late_weight < 0 || settings.late_weight > 1) {
    throw new Error('Attendance thresholds must be 0–100, and late attendance weight must be 0–1.')
  }
  if (settings.critical_threshold > settings.warning_threshold) {
    throw new Error('The critical threshold must not exceed the warning threshold.')
  }
  const { error } = await requireSupabase()
    .from('academic_attendance_settings')
    .update({
      recommended_threshold: settings.recommended_threshold,
      warning_threshold: settings.warning_threshold,
      critical_threshold: settings.critical_threshold,
      late_weight: settings.late_weight,
      excused_counts_as_eligible: settings.excused_counts_as_eligible,
      updated_at: new Date().toISOString(),
    })
    .eq('singleton', true)
  if (error) throw new Error('Unable to update attendance settings. Verify thresholds are between 0 and 100.')
}

export async function getFacultyAssignments(): Promise<FacultyAssignment[]> {
  const { data, error } = await requireSupabase()
    .from('faculty_subjects')
    .select('id,subject_id,academic_period_id,academic_year,semester,section,subject:subjects(subject_code,subject_name),period:academic_periods(name,status)')
    .eq('status', 'active')
    .order('assigned_at', { ascending: false })
  if (error) throw new Error('Unable to load your teaching assignments.')
  return (data ?? []) as unknown as FacultyAssignment[]
}

export async function getMyAttendanceSessions(): Promise<AttendanceSession[]> {
  const { data, error } = await requireSupabase()
    .from('attendance_sessions')
    .select('id,subject_id,academic_period_id,session_date,section,topic,status,created_at')
    .order('session_date', { ascending: false })
    .limit(20)
  if (error) throw new Error('Unable to load attendance sessions.')
  return (data ?? []) as AttendanceSession[]
}

export async function createAttendanceSession(input: {
  subjectId: string
  periodId: string
  section: string
  topic: string
  date: string
}): Promise<string> {
  const { data: userData, error: authError } = await requireSupabase().auth.getUser()
  if (authError || !userData.user) throw new Error('Sign in again to create an attendance session.')
  const { data, error } = await requireSupabase()
    .from('attendance_sessions')
    .insert({
      subject_id: input.subjectId,
      academic_period_id: input.periodId,
      faculty_id: userData.user.id,
      session_date: input.date,
      section: input.section,
      topic: input.topic.trim() || null,
    })
    .select('id')
    .single()
  if (error) throw new Error('Unable to create the attendance session. Verify that you are assigned to this subject and section.')
  return data.id
}

export async function getAttendanceRoster(sessionId: string): Promise<AttendanceRosterEntry[]> {
  const { data, error } = await requireSupabase().rpc('get_attendance_roster', { target_session_id: sessionId })
  if (error) throw new Error('Unable to load the authorized class roster.')
  return (data ?? []) as AttendanceRosterEntry[]
}

export async function saveAttendance(
  sessionId: string,
  records: Array<{ student_id: string; status: AttendanceStatus; remarks?: string; reason?: string }>,
): Promise<number> {
  const { data, error } = await requireSupabase().rpc('save_attendance', {
    target_session_id: sessionId,
    submitted_records: records,
  })
  if (error) {
    const message = error.message.toLocaleLowerCase()
    if (message.includes('reason is required')) throw new Error('Add a reason for every corrected attendance status.')
    if (message.includes('exactly one attendance status')) throw new Error('Choose a status for every enrolled student before saving.')
    if (message.includes('not authorized')) throw new Error('You are not assigned to this attendance session.')
    if (message.includes('cancelled')) throw new Error('Cancelled attendance sessions cannot be changed.')
    throw new Error('Unable to save attendance. Verify the roster and try again.')
  }
  const result = data as { saved_count?: number } | null
  return result?.saved_count ?? 0
}

export async function createAcademicPeriod(input: {
  name: string
  startDate: string
  endDate: string
  semester: number | null
  status: 'upcoming' | 'active'
}): Promise<void> {
  const { error } = await requireSupabase().from('academic_periods').insert({
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    semester: input.semester,
    status: input.status,
  })
  if (error) throw new Error('Unable to create the academic period. Check the date range and active-period setting.')
}

export async function updateAcademicPeriodStatus(periodId: string, status: AcademicPeriod['status']): Promise<void> {
  const { error } = await requireSupabase().from('academic_periods').update({ status }).eq('id', periodId)
  if (error) throw new Error('Unable to update academic period status. Only one period per semester may be active.')
}

export async function createAcademicSection(input: {
  department: string
  semester: number
  section: string
  periodId: string
  academicYear: string
  capacity: number | null
}): Promise<void> {
  const { error } = await requireSupabase().from('academic_sections').upsert({
    department: input.department.trim(),
    semester: input.semester,
    section_name: input.section.trim(),
    academic_period_id: input.periodId,
    academic_year: input.academicYear.trim(),
    capacity: input.capacity,
    status: 'active',
  }, { onConflict: 'department,semester,section_name,academic_period_id' })
  if (error) throw new Error('Unable to create this section. It may already exist for the selected period.')
}

export async function getAcademicSections(): Promise<AcademicSection[]> {
  const { data, error } = await requireSupabase()
    .from('academic_sections')
    .select('id,department,semester,section_name,academic_period_id,academic_year,capacity,status')
    .order('department')
    .order('semester')
  if (error) throw new Error('Unable to load academic sections.')
  return (data ?? []) as AcademicSection[]
}

export async function setAcademicSectionStatus(sectionId: string, status: AcademicSection['status']): Promise<void> {
  const { error } = await requireSupabase().from('academic_sections').update({ status }).eq('id', sectionId)
  if (error) throw new Error('Unable to update this section.')
}

export async function createFacultyAssignment(input: {
  facultyId: string
  subjectId: string
  periodId: string
  academicYear: string
  semester: number
  section: string
}): Promise<void> {
  const { error } = await requireSupabase().from('faculty_subjects').upsert({
    faculty_id: input.facultyId,
    subject_id: input.subjectId,
    academic_period_id: input.periodId,
    academic_year: input.academicYear.trim(),
    semester: input.semester,
    section: input.section.trim(),
    status: 'active',
  }, { onConflict: 'faculty_id,subject_id,academic_period_id,section' })
  if (error) throw new Error('Unable to assign this faculty member. Check the selected subject, period, and section.')
}

export async function createTimetableEntry(input: {
  facultyId: string
  subjectId: string
  periodId: string
  academicYear: string
  department: string
  semester: number
  section: string
  day: string
  startTime: string
  endTime: string
  room: string
  building: string
}): Promise<void> {
  const { error } = await requireSupabase().from('timetable_entries').insert({
    faculty_id: input.facultyId,
    subject_id: input.subjectId,
    academic_period_id: input.periodId,
    academic_year: input.academicYear.trim(),
    department: input.department.trim(),
    semester: input.semester,
    section: input.section.trim(),
    day_of_week: input.day,
    start_time: input.startTime,
    end_time: input.endTime,
    room: input.room.trim() || null,
    building: input.building.trim() || null,
  })
  if (error) {
    if (error.code === '23P01' || error.message.includes('TIMETABLE_CONFLICT')) {
      throw new Error('This time overlaps an existing faculty, room, or section booking.')
    }
    throw new Error('Unable to create this timetable entry. Confirm that the faculty assignment and period are valid.')
  }
}

export async function getAcademicFaculty(): Promise<Array<{ auth_user_id: string; full_name: string; department: string | null }>> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('auth_user_id,full_name,department')
    .eq('role', 'faculty')
    .order('full_name')
  if (error) throw new Error('Unable to load faculty accounts.')
  return (data ?? []) as Array<{ auth_user_id: string; full_name: string; department: string | null }>
}

export async function getAcademicAssignments(): Promise<FacultyAssignment[]> {
  const { data, error } = await requireSupabase()
    .from('faculty_subjects')
    .select('id,subject_id,academic_period_id,academic_year,semester,section,status,subject:subjects(subject_code,subject_name),period:academic_periods(name,status),faculty:profiles!faculty_subjects_faculty_id_fkey(full_name)')
    .order('assigned_at', { ascending: false })
    .limit(200)
  if (error) throw new Error('Unable to load academic faculty assignments.')
  return ((data ?? []) as unknown as Array<FacultyAssignment & { faculty?: { full_name: string } | null }>)
    .map(({ faculty, ...assignment }) => ({ ...assignment, faculty_name: faculty?.full_name ?? 'Faculty' }))
}

export async function setFacultyAssignmentStatus(assignmentId: string, status: FacultyAssignment['status']): Promise<void> {
  const { error } = await requireSupabase().from('faculty_subjects').update({ status }).eq('id', assignmentId)
  if (error) throw new Error('Unable to update this faculty assignment.')
}

export async function getAcademicTimetableEntries(): Promise<TimetableEntry[]> {
  const { data, error } = await requireSupabase()
    .from('timetable_entries')
    .select('id,subject_id,faculty_id,academic_period_id,department,semester,section,day_of_week,start_time,end_time,room,building,class_type,status,subject:subjects(subject_code,subject_name),faculty:profiles!timetable_entries_faculty_id_fkey(full_name)')
    .order('day_of_week')
    .order('start_time')
    .limit(500)
  if (error) throw new Error('Unable to load timetable management data.')
  return (data ?? []).map((row) => {
    const entry = row as unknown as Record<string, unknown>
    const subject = entry.subject as { subject_code: string; subject_name: string } | null
    const faculty = entry.faculty as { full_name: string } | null
    return {
      ...entry,
      subject_code: subject?.subject_code ?? '',
      subject_name: subject?.subject_name ?? '',
      faculty_name: faculty?.full_name ?? null,
    } as unknown as TimetableEntry
  })
}

export async function setTimetableEntryStatus(entryId: string, status: 'active' | 'cancelled' | 'archived'): Promise<void> {
  const { error } = await requireSupabase().from('timetable_entries').update({ status, updated_at: new Date().toISOString() }).eq('id', entryId)
  if (error) throw new Error('Unable to update timetable entry.')
}

export function calculateAttendanceProjection(
  attended: number,
  eligible: number,
  targetPercentage: number,
): { currentPercentage: number | null; classesNeeded: number | null } {
  if (!Number.isFinite(attended) || !Number.isInteger(eligible) || eligible < 0
    || !Number.isFinite(targetPercentage) || targetPercentage < 0 || targetPercentage > 100) {
    throw new Error('Attendance calculation inputs are invalid.')
  }
  const currentPercentage = eligible > 0 ? Math.round((attended / eligible) * 10000) / 100 : null
  if (eligible === 0 || currentPercentage === null || currentPercentage >= targetPercentage) {
    return { currentPercentage, classesNeeded: eligible === 0 ? null : 0 }
  }
  if (targetPercentage === 100) return { currentPercentage, classesNeeded: null }
  const required = Math.ceil(((targetPercentage / 100) * eligible - attended) / (1 - targetPercentage / 100))
  return { currentPercentage, classesNeeded: Math.max(0, required) }
}
