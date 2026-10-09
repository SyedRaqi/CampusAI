import { useCallback, useEffect, useMemo, useState, type DependencyList, type FormEvent, type ReactNode } from 'react'
import { BookOpenCheck, CalendarClock, Check, CircleAlert, GraduationCap, Plus, Users } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import {
  createAcademicPeriod,
  createAcademicSection,
  createAttendanceSession,
  createFacultyAssignment,
  createTimetableEntry,
  getAcademicAttendanceAnalytics,
  getAcademicAssignments,
  getAcademicSubject,
  getAcademicSections,
  getAcademicTimetableEntries,
  getAttendanceSettings,
  enrollInSubject,
  getAcademicCatalog,
  getAcademicFaculty,
  getAcademicPeriods,
  getMyAttendanceTrend,
  getAttendanceRoster,
  getFacultyAssignments,
  getMyAttendanceSessions,
  getMyAttendanceSummary,
  getMyEnrollments,
  getMyTimetable,
  calculateAttendanceProjection,
  saveAttendance,
  setAcademicSectionStatus,
  setFacultyAssignmentStatus,
  setTimetableEntryStatus,
  updateAcademicPeriodStatus,
  updateAttendanceSettings,
} from '../services/academicService'
import type {
  AcademicSubject,
  AcademicSection,
  AttendanceTrendPoint,
  AttendanceRosterEntry,
  AttendanceStatus,
  AttendanceSummary,
  EnrolledSubject,
  FacultyAssignment,
  TimetableEntry,
} from '../types/academic'
import type { AttendanceSettings } from '../services/academicService'
import { listResources, RESOURCE_PAGE_SIZE } from '../services/resourceService'
import type { Resource } from '../types'
import './academics.css'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const statuses: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']
const defaultAttendanceSettings: AttendanceSettings = {
  recommended_threshold: 75,
  warning_threshold: 75,
  critical_threshold: 60,
  late_weight: 1,
  excused_counts_as_eligible: false,
}

function localWeekday(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
}

function AcademicFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  const { role } = useAuth()
  const items = role === 'admin'
    ? [{ label: 'Configure', path: '/admin/academics' }, { label: 'Timetable', path: '/timetable' }]
    : role === 'faculty'
      ? [{ label: 'Attendance sessions', path: '/faculty/attendance' }, { label: 'Timetable', path: '/faculty/timetable' }]
      : [{ label: 'Subjects', path: '/academics' }, { label: 'Timetable', path: '/timetable' }, { label: 'Attendance', path: '/attendance' }]
  return <PageContainer className="placeholder-shell"><main className="academic-page">
    <header className="academic-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      <nav aria-label="Academic navigation">{items.map((item) => <Link key={item.path} to={item.path}>{item.label}</Link>)}</nav>
    </header>{children}
  </main></PageContainer>
}

function useLoad<T>(load: () => Promise<T>, deps: DependencyList = []) {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(() => {
    let active = true
    setLoading(true)
    setError('')
    void load().then((result) => {
      if (active) setValue(result)
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load academic data.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  // load is supplied by module-level service closures, and deps define its identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => refresh(), [refresh])
  return { value, error, loading, refresh }
}

function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null
  return <p className={error ? 'academic-notice academic-error' : 'academic-notice'} role={error ? 'alert' : 'status'}>
    {error ? <CircleAlert size={17} /> : <Check size={17} />}{error || message}
  </p>
}

function SubjectCard({ subject, enrolled, onEnroll, disabled }: {
  subject: AcademicSubject
  enrolled: boolean
  onEnroll: (subjectId: string) => void
  disabled: boolean
}) {
  return <article className="academic-card">
    <div className="academic-card-icon"><BookOpenCheck size={20} /></div>
    <div className="academic-card-main">
      <p className="academic-card-code">{subject.subject_code} · Semester {subject.semester}</p>
      <h2><Link to={`/academics/subjects/${subject.id}`}>{subject.subject_name}</Link></h2>
      <p>{subject.branch?.name || 'Department'}{subject.credits ? ` · ${subject.credits} credits` : ''} · {subject.subject_type}</p>
      {subject.description && <p className="academic-description">{subject.description}</p>}
      <div className="academic-card-actions">
        <Link className="academic-secondary" to={`/resources?search=${encodeURIComponent(subject.subject_code)}`}>Subject resources</Link>
        {enrolled ? <span className="academic-pill">Enrolled</span> : <button type="button" className="academic-primary" disabled={disabled} onClick={() => onEnroll(subject.id)}>Enroll</button>}
      </div>
    </div>
  </article>
}

function AcademicOverview({ subjects, attendance }: { subjects: EnrolledSubject[]; attendance: AttendanceSummary[] }) {
  const credits = subjects.reduce((sum, item) => sum + (item.subject.credits || 0), 0)
  const counted = attendance.filter((item) => item.percentage !== null)
  const meanAttendance = counted.length
    ? `${Math.round(counted.reduce((sum, item) => sum + (item.percentage ?? 0), 0) / counted.length)}%`
    : 'Not available'
  return <section className="academic-overview" aria-label="Semester overview">
    <article><span>Enrolled subjects</span><strong>{subjects.length}</strong></article>
    <article><span>Registered credits</span><strong>{credits}</strong></article>
    <article><span>Attendance average</span><strong>{meanAttendance}</strong></article>
    <article><span>Academic performance</span><strong className="academic-overview-note">Not available</strong><small>No verified grade data is connected.</small></article>
  </section>
}

export function AcademicsPage() {
  const { profile, user } = useAuth()
  const profileSemester = profile?.semester ? Number(profile.semester) : Number.NaN
  const validSemester = Number.isInteger(profileSemester) && profileSemester >= 1 && profileSemester <= 8
  const catalog = useLoad(() => getAcademicCatalog(validSemester ? profileSemester : undefined), [profileSemester])
  const enrollments = useLoad(getMyEnrollments)
  const attendance = useLoad(getMyAttendanceSummary)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const enrolledIds = useMemo(() => new Set((enrollments.value ?? []).map((item) => item.subject_id)), [enrollments.value])
  const department = profile?.department?.trim().toLocaleLowerCase()
  const availableSubjects = (catalog.value ?? []).filter((subject) =>
    !department || subject.branch?.name.trim().toLocaleLowerCase() === department
      || subject.branch?.code.trim().toLocaleLowerCase() === department
  )

  const enroll = async (subjectId: string) => {
    if (!user?.id || !profile || !validSemester || !profile.section) {
      setError('Complete your semester and section in your profile before enrolling.')
      return
    }
    setBusyId(subjectId)
    setError('')
    setNotice('')
    try {
      await enrollInSubject({ userId: user.id, semester: profileSemester, section: profile.section, subjectId })
      setNotice('You are enrolled in this subject.')
      enrollments.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to enroll in this subject.')
    } finally {
      setBusyId('')
    }
  }

  return <AcademicFrame eyebrow="Learning workspace" title="Academics">
    <Notice error={catalog.error || enrollments.error || attendance.error || error} message={notice} />
    <AcademicOverview subjects={enrollments.value ?? []} attendance={attendance.value ?? []} />
    <div className="academic-section-heading"><div><h2>My subjects</h2><p>Subjects enrolled for your account and active academic period.</p></div><Link className="academic-secondary" to="/ai/study-planner">Plan with AI</Link></div>
    <div className="academic-card-list">
      {(enrollments.value ?? []).map((item: EnrolledSubject) => <SubjectCard key={item.id} subject={item.subject} enrolled onEnroll={() => undefined} disabled />)}
      {!enrollments.loading && enrollments.value?.length === 0 && <p className="academic-empty">No subjects are enrolled for your profile yet.</p>}
    </div>
    <div className="academic-section-heading"><div><h2>Available subjects</h2><p>Catalog entries are shown from the active academic records; demo subjects are excluded.</p></div></div>
    {catalog.loading ? <p className="academic-empty">Loading subjects…</p> : <div className="academic-card-list">
      {availableSubjects.map((subject) => <SubjectCard key={subject.id} subject={subject} enrolled={enrolledIds.has(subject.id)} onEnroll={(id) => void enroll(id)} disabled={Boolean(busyId)} />)}
      {!catalog.error && availableSubjects.length === 0 && <p className="academic-empty">No active subjects match your department and semester.</p>}
    </div>}
  </AcademicFrame>
}

export function AcademicSubjectDetailPage() {
  const { subjectId = '' } = useParams()
  const subject = useLoad(() => getAcademicSubject(subjectId), [subjectId])
  const resources = useLoad(async () => (await listResources({ subjectId, pageSize: RESOURCE_PAGE_SIZE })).resources, [subjectId])

  return <AcademicFrame eyebrow="Subject workspace" title={subject.value?.subject_name || 'Subject details'}>
    <Notice error={subject.error || resources.error} />
    {subject.loading ? <p className="academic-empty">Loading subject…</p> : !subject.value
      ? <p className="academic-empty">This subject is unavailable or inactive.</p>
      : <section className="academic-section">
        <div><p className="academic-card-code">{subject.value.subject_code} · Semester {subject.value.semester}</p>
          <p>{subject.value.branch?.name} · {subject.value.subject_type} · {subject.value.credits} credits</p>
          {subject.value.description && <p>{subject.value.description}</p>}</div>
        <div className="academic-card-actions">
          <Link className="academic-secondary" to={`/ai?mode=study&prompt=${encodeURIComponent(`Help me study ${subject.value.subject_code} ${subject.value.subject_name}. Use my enrolled subject context and suggest an effective study plan.`)}`}>Plan study</Link>
          <Link className="academic-secondary" to={`/ai?mode=study&prompt=${encodeURIComponent(`Create concise revision notes for ${subject.value.subject_code} ${subject.value.subject_name}. Clearly distinguish general explanations from verified campus resources.`)}`}>Create notes</Link>
          <Link className="academic-secondary" to={`/ai?mode=study&prompt=${encodeURIComponent(`Create a practice quiz for ${subject.value.subject_code} ${subject.value.subject_name}. Do not show answers until I submit.`)}`}>Practice quiz</Link>
        </div>
        <div className="academic-section-heading"><div><h2>Learning resources</h2><p>Published resources visible to your account.</p></div><Link className="academic-secondary" to={`/resources?search=${encodeURIComponent(subject.value.subject_code)}`}>Browse all matching resources</Link></div>
        {resources.loading ? <p className="academic-empty">Loading resources…</p> : (resources.value ?? []).length
          ? <div className="academic-card-list">{(resources.value ?? []).map((resource: Resource) => <Link className="academic-resource-row" key={resource.id} to={`/resources/${resource.id}`}>
            <span><strong>{resource.title}</strong><small>{resource.resource_type} · {resource.file_type}</small></span><span aria-hidden="true">Open →</span>
          </Link>)}</div>
          : <p className="academic-empty">No published resources are available for this subject.</p>}
        <Link className="academic-primary" to="/ai">Open CampusConnect AI</Link>
      </section>}
  </AcademicFrame>
}

function TimetableView({ entries }: { entries: TimetableEntry[] }) {
  const today = localWeekday()
  const [selectedDay, setSelectedDay] = useState(days.includes(today) ? today : 'Monday')
  const grouped = days.map((day) => ({ day, items: entries.filter((entry) => entry.day_of_week === day) })).filter((group) => group.items.length)
  const selectedEntries = entries.filter((entry) => entry.day_of_week === selectedDay)
  if (!grouped.length) return <p className="academic-empty">No timetable entries are available for your active academic period.</p>
  return <>
    <label className="academic-day-selector">View day<select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
    <div className="academic-week academic-week-desktop">
    {grouped.map(({ day, items }) => <section className="academic-day" key={day}>
      <h2>{day}</h2>
      {items.map((entry) => <article className="academic-class" key={entry.id}>
        <time>{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</time>
        <div><strong>{entry.subject_code} · {entry.subject_name}</strong><p>{entry.faculty_name || 'Faculty'} · Section {entry.section}</p></div>
        <span>{[entry.building, entry.room].filter(Boolean).join(' · ') || 'Room not assigned'}</span>
      </article>)}
    </section>)}
    </div>
    <div className="academic-week academic-week-mobile">
      {selectedEntries.length ? <section className="academic-day"><h2>{selectedDay}</h2>
        {selectedEntries.map((entry) => <article className="academic-class" key={entry.id}>
          <time>{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</time>
          <div><strong>{entry.subject_code} · {entry.subject_name}</strong><p>{entry.faculty_name || 'Faculty'} · Section {entry.section}</p></div>
          <span>{[entry.building, entry.room].filter(Boolean).join(' · ') || 'Room not assigned'}</span>
        </article>)}
      </section> : <p className="academic-empty">No classes are scheduled for {selectedDay}.</p>}
    </div>
  </>
}

export function TimetablePage() {
  const timetable = useLoad(getMyTimetable)
  return <AcademicFrame eyebrow="Academic schedule" title="My timetable">
    <Notice error={timetable.error} />
    {timetable.loading ? <p className="academic-empty">Loading timetable…</p> : <TimetableView entries={timetable.value ?? []} />}
  </AcademicFrame>
}

export function AttendancePage() {
  const summary = useLoad(getMyAttendanceSummary)
  const trends = useLoad(getMyAttendanceTrend)
  const [target, setTarget] = useState(75)
  const projections = (summary.value ?? []).map((row) => ({
    row,
    result: calculateAttendanceProjection(row.attended, row.eligible, target),
  }))
  return <AcademicFrame eyebrow="Academic progress" title="Attendance">
    <Notice error={summary.error || trends.error} />
    <p className="academic-callout">Attendance percentages are calculated from completed sessions. Excused absences are excluded unless the academic administrator changes the campus setting. Verify attendance with your instructor if a record looks incorrect.</p>
    <section className="academic-section academic-projection">
      <label>Target attendance for projection <input type="number" min={0} max={100} value={target} onChange={(event) => setTarget(Number(event.target.value))} />%</label>
      <p className="academic-muted">Projection assumes future classes are attended; it is an estimate, not an official attendance record.</p>
    </section>
    {summary.loading ? <p className="academic-empty">Loading attendance…</p> : projections.length ? <div className="academic-card-list">
      {projections.map(({ row, result }) => <article className="academic-card academic-attendance-card" key={row.subject_id}>
        <div><p className="academic-card-code">{row.subject_code}</p><h2>{row.subject_name}</h2><p>{row.present_count} present · {row.late_count} late · {row.absent_count} absent · {row.excused_count} excused</p></div>
        <div className="academic-attendance-rate"><strong>{row.percentage === null ? '—' : `${row.percentage}%`}</strong><span>Recommended threshold {row.threshold}%</span>
          {row.percentage !== null && row.percentage < row.threshold && <span className="academic-risk">Below threshold</span>}
          <span>{result.classesNeeded === null ? 'Not enough data for a projection' : result.classesNeeded === 0 ? 'At target' : `Attend ${result.classesNeeded} consecutive classes to reach ${target}%`}</span></div>
      </article>)}
    </div> : <p className="academic-empty">Attendance summaries appear after your faculty records completed class sessions.</p>}
    <section className="academic-section"><h2>Monthly attendance trend</h2>
      {trends.loading ? <p className="academic-empty">Loading trend…</p> : trends.value?.length
        ? <div className="academic-trend-list">{trends.value.map((point: AttendanceTrendPoint) => <div key={point.month} className="academic-trend-row"><strong>{point.month}</strong><progress max={100} value={point.percentage ?? 0} aria-label={`${point.month}: ${point.percentage ?? 'no'} percent attendance`} /><span>{point.percentage === null ? '—' : `${point.percentage}%`} · {point.attended}/{point.eligible}</span></div>)}</div>
        : !trends.error && <p className="academic-empty">Monthly trends appear after attendance is recorded.</p>}
    </section>
  </AcademicFrame>
}

export function FacultyAttendancePage() {
  const assignments = useLoad(getFacultyAssignments)
  const sessions = useLoad(getMyAttendanceSessions)
  const [assignmentId, setAssignmentId] = useState('')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState('')
  const [activeSession, setActiveSession] = useState('')
  const [roster, setRoster] = useState<AttendanceRosterEntry[]>([])
  const [statusEdits, setStatusEdits] = useState<Record<string, AttendanceStatus | ''>>({})
  const [correctionReasons, setCorrectionReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const selected = (assignments.value ?? []).find((item) => item.id === assignmentId)

  const createSession = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const sessionId = await createAttendanceSession({
        subjectId: selected.subject_id,
        periodId: selected.academic_period_id,
        section: selected.section,
        topic,
        date,
      })
      setActiveSession(sessionId)
      setNotice('Session created. Load the roster to mark attendance.')
      sessions.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create an attendance session.')
    } finally {
      setBusy(false)
    }
  }

  const loadRoster = async (sessionId: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const rows = await getAttendanceRoster(sessionId)
      setRoster(rows)
      setActiveSession(sessionId)
      setStatusEdits(Object.fromEntries(rows.map((row) => [row.student_id, row.status ?? ''])))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the roster.')
    } finally {
      setBusy(false)
    }
  }

  const submitAttendance = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeSession) return
    const incomplete = roster.some((row) => !statusEdits[row.student_id])
    if (incomplete) {
      setError('Choose an attendance status for every enrolled student.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const count = await saveAttendance(activeSession, roster.map((row) => ({
        student_id: row.student_id,
        status: statusEdits[row.student_id] as AttendanceStatus,
        remarks: row.remarks ?? undefined,
        reason: correctionReasons[row.student_id],
      })))
      setNotice(`Saved ${count} attendance records. Corrections require a reason and are audited.`)
      await loadRoster(activeSession)
      sessions.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save attendance.')
    } finally {
      setBusy(false)
    }
  }

  return <AcademicFrame eyebrow="Faculty workspace" title="Attendance sessions">
    <Notice error={assignments.error || sessions.error || error} message={notice} />
    {assignments.loading ? <p className="academic-empty">Loading assignments…</p> : !(assignments.value ?? []).length
      ? <p className="academic-empty">There are no active teaching assignments for your account.</p>
      : <form className="academic-form academic-session-form" onSubmit={(event) => void createSession(event)}>
        <h2><CalendarClock size={19} /> Start a class session</h2>
        <label>Teaching assignment<select required value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>
          <option value="">Choose a subject and section</option>
          {(assignments.value ?? []).map((item: FacultyAssignment) => <option key={item.id} value={item.id}>{item.subject.subject_code} · {item.subject.subject_name} · Sec {item.section} · {item.period.name}</option>)}
        </select></label>
        <label>Session date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Topic (optional)<input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={160} placeholder="e.g. Relational algebra" /></label>
        <button className="academic-primary" disabled={busy || !selected}><Plus size={16} /> Create session</button>
      </form>}
    {!!(sessions.value ?? []).length && <section className="academic-section">
      <h2>Recent sessions</h2><div className="academic-session-list">{(sessions.value ?? []).map((session) => <button type="button" key={session.id} className={session.id === activeSession ? 'academic-session active' : 'academic-session'} onClick={() => void loadRoster(session.id)}>
        <span><strong>{session.session_date}</strong>{session.topic && <small>{session.topic}</small>}</span><span>{session.section} · {session.status}</span>
      </button>)}</div>
    </section>}
    {!!activeSession && roster.length > 0 && <form className="academic-section" onSubmit={(event) => void submitAttendance(event)}>
      <h2>Class roster <span className="academic-count">{roster.length}</span></h2>
      <p className="academic-muted">Changing an already-marked status requires a reason; changes are retained in the attendance audit log.</p>
      <div className="academic-roster">{roster.map((row) => <div className="academic-roster-row" key={row.student_id}>
        <strong>{row.full_name}</strong>
        <select aria-label={`Attendance for ${row.full_name}`} required value={statusEdits[row.student_id] ?? ''} onChange={(event) => setStatusEdits((current) => ({ ...current, [row.student_id]: event.target.value as AttendanceStatus | '' }))}>
          <option value="">Select status</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        {row.status && statusEdits[row.student_id] !== row.status && <input aria-label={`Correction reason for ${row.full_name}`} required value={correctionReasons[row.student_id] ?? ''} onChange={(event) => setCorrectionReasons((current) => ({ ...current, [row.student_id]: event.target.value }))} placeholder="Correction reason" />}
      </div>)}</div>
      <button className="academic-primary" disabled={busy}><Check size={16} /> Save and complete session</button>
    </form>}
    {!!activeSession && !busy && roster.length === 0 && <p className="academic-empty">This session has no enrolled students, or the roster is still loading.</p>}
  </AcademicFrame>
}

export function AdminAcademicsPage() {
  const periods = useLoad(getAcademicPeriods)
  const catalog = useLoad(() => getAcademicCatalog())
  const faculty = useLoad(getAcademicFaculty)
  const analytics = useLoad(getAcademicAttendanceAnalytics)
  const sections = useLoad(getAcademicSections)
  const assignments = useLoad(getAcademicAssignments)
  const timetableEntries = useLoad(getAcademicTimetableEntries)
  const settings = useLoad(getAttendanceSettings)
  const [periodName, setPeriodName] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [periodSemester, setPeriodSemester] = useState('')
  const [periodStatus, setPeriodStatus] = useState<'upcoming' | 'active'>('upcoming')
  const [section, setSection] = useState('')
  const [capacity, setCapacity] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [facultyId, setFacultyId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [day, setDay] = useState('Monday')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [room, setRoom] = useState('')
  const [building, setBuilding] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attendanceSettings, setAttendanceSettings] = useState<AttendanceSettings | null>(null)
  const attendanceSettingsForm = attendanceSettings ?? settings.value ?? defaultAttendanceSettings
  const selectedSubject = (catalog.value ?? []).find((item) => item.id === subjectId)
  const selectedPeriod = (periods.value ?? []).find((item) => item.id === periodId)
  const sectionName = section.trim()

  const refreshAll = () => {
    periods.refresh(); catalog.refresh(); faculty.refresh()
    sections.refresh(); assignments.refresh(); timetableEntries.refresh(); analytics.refresh(); settings.refresh()
  }
  const updateRecord = async (operation: () => Promise<void>, successMessage: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await operation()
      setNotice(successMessage)
      refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update academic data.')
    } finally { setBusy(false) }
  }
  const submitPeriod = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await createAcademicPeriod({ name: periodName, startDate: periodStart, endDate: periodEnd, semester: periodSemester ? Number(periodSemester) : null, status: periodStatus })
      setPeriodName(''); setNotice('Academic period created.'); refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the period.')
    } finally { setBusy(false) }
  }
  const submitSectionAndAssignment = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedSubject || !selectedPeriod || !facultyId) return
    setBusy(true); setError(''); setNotice('')
    try {
      await createAcademicSection({
        department: selectedSubject.branch.name,
        semester: selectedSubject.semester,
        section: sectionName,
        periodId,
        academicYear: academicYear || selectedPeriod.name,
        capacity: capacity ? Number(capacity) : null,
      })
      await createFacultyAssignment({
        facultyId, subjectId, periodId, academicYear: academicYear || selectedPeriod.name,
        semester: selectedSubject.semester, section: sectionName,
      })
      setNotice('Section and faculty assignment saved.'); setSection(''); refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to configure this section.')
    } finally { setBusy(false) }
  }
  const submitTimetable = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedSubject || !selectedPeriod || !facultyId) return
    setBusy(true); setError(''); setNotice('')
    try {
      await createTimetableEntry({
        facultyId, subjectId, periodId, academicYear: academicYear || selectedPeriod.name,
        department: selectedSubject.branch.name, semester: selectedSubject.semester,
        section: sectionName, day, startTime, endTime, room, building,
      })
      setNotice('Timetable entry created. Database conflict checks are enforced.'); refreshAll()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the timetable entry.')
    } finally { setBusy(false) }
  }

  return <AcademicFrame eyebrow="Academic administration" title="Academic operations">
    <Notice error={periods.error || catalog.error || faculty.error || analytics.error || sections.error || assignments.error || timetableEntries.error || settings.error || error} message={notice} />
    <section className="academic-section"><h2>Attendance overview</h2>
      {analytics.loading ? <p className="academic-empty">Loading aggregate attendance metrics…</p> : analytics.value?.length
        ? <div className="academic-card-list">{analytics.value.map((row) => <article className="academic-admin-analytics" key={row.subject_id}>
          <div><strong>{row.subject_code} · {row.subject_name}</strong><p>{row.active_students} active students · {row.completed_sessions} completed sessions</p></div>
          <div><strong>{row.recorded_attendance === null ? '—' : `${row.recorded_attendance}%`}</strong><small>Recorded attendance</small></div>
        </article>)}</div>
        : !analytics.error && <p className="academic-empty">Aggregate attendance analytics will appear after completed sessions are recorded.</p>}
    </section>
    <section className="academic-section"><h2><CalendarClock size={19} /> Academic periods</h2>
      <div className="academic-period-list">{(periods.value ?? []).map((period) => <label className="academic-admin-status" key={period.id}><span>{period.name}</span><select aria-label={`Status for ${period.name}`} value={period.status} disabled={busy} onChange={(event) => void updateRecord(() => updateAcademicPeriodStatus(period.id, event.target.value as typeof period.status), 'Academic period status updated.')}>{['upcoming', 'active', 'completed', 'archived'].map((status) => <option key={status}>{status}</option>)}</select></label>)}{periods.loading && <span>Loading periods…</span>}</div>
      <form className="academic-form academic-admin-form" onSubmit={(event) => void submitPeriod(event)}>
        <label>Period name<input required value={periodName} onChange={(event) => setPeriodName(event.target.value)} placeholder="Fall 2026" maxLength={80} /></label>
        <label>Start date<input required type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
        <label>End date<input required type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
        <label>Semester (optional)<input type="number" min={1} max={8} value={periodSemester} onChange={(event) => setPeriodSemester(event.target.value)} /></label>
        <label>Status<select value={periodStatus} onChange={(event) => setPeriodStatus(event.target.value as 'upcoming' | 'active')}><option value="upcoming">Upcoming</option><option value="active">Active</option></select></label>
        <button className="academic-primary" disabled={busy}><Plus size={16} /> Create period</button>
      </form>
    </section>
    <section className="academic-section"><h2><Users size={19} /> Configure section and faculty assignment</h2>
      <form className="academic-form academic-admin-form" onSubmit={(event) => void submitSectionAndAssignment(event)}>
        <label>Subject<select required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Select subject</option>{(catalog.value ?? []).map((subject) => <option key={subject.id} value={subject.id}>{subject.subject_code} · {subject.subject_name} · Sem {subject.semester}</option>)}</select></label>
        <label>Academic period<select required value={periodId} onChange={(event) => setPeriodId(event.target.value)}><option value="">Select period</option>{(periods.value ?? []).map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
        <label>Faculty<select required value={facultyId} onChange={(event) => setFacultyId(event.target.value)}><option value="">Select faculty</option>{(faculty.value ?? []).map((person) => <option key={person.auth_user_id} value={person.auth_user_id}>{person.full_name}</option>)}</select></label>
        <label>Section<input required value={section} onChange={(event) => setSection(event.target.value)} maxLength={40} placeholder="A" /></label>
        <label>Academic year label<input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder={selectedPeriod?.name || '2026–27'} maxLength={24} /></label>
        <label>Section capacity<input type="number" min={1} max={500} value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Optional" /></label>
        <button className="academic-primary" disabled={busy || !selectedSubject || !selectedPeriod}><Plus size={16} /> Save section and assignment</button>
      </form>
      <div className="academic-admin-list" aria-label="Academic sections">{(sections.value ?? []).map((item: AcademicSection) => <article key={item.id}>
        <span><strong>{item.department} · Semester {item.semester} · Section {item.section_name}</strong><small>{item.academic_year} · Capacity {item.capacity ?? 'not set'}</small></span>
        <select aria-label={`Status for section ${item.section_name}`} value={item.status} disabled={busy} onChange={(event) => void updateRecord(() => setAcademicSectionStatus(item.id, event.target.value as AcademicSection['status']), 'Section status updated.')}>
          <option value="active">Active</option><option value="archived">Archived</option>
        </select>
      </article>)}</div>
    </section>
    <section className="academic-section"><h2>Faculty assignments</h2>
      <div className="academic-admin-list">{(assignments.value ?? []).map((item) => <article key={item.id}>
        <span><strong>{item.subject.subject_code} · {item.subject.subject_name} · Section {item.section}</strong><small>{item.faculty_name} · {item.period.name} · {item.academic_year}</small></span>
        <select aria-label={`Status for ${item.subject.subject_code} assignment`} value={item.status} disabled={busy} onChange={(event) => void updateRecord(() => setFacultyAssignmentStatus(item.id, event.target.value as typeof item.status), 'Faculty assignment status updated.')}>
          <option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option>
        </select>
      </article>)}</div>
      {!assignments.loading && !assignments.error && !assignments.value?.length && <p className="academic-empty">No faculty assignments are configured.</p>}
    </section>
    <section className="academic-section"><h2><GraduationCap size={19} /> Timetable entry</h2>
      <p className="academic-muted">Use the same subject, faculty, period, and section as its active teaching assignment. Overlapping room, faculty, or section bookings are rejected in the database.</p>
      <form className="academic-form academic-admin-form" onSubmit={(event) => void submitTimetable(event)}>
        <label>Day<select value={day} onChange={(event) => setDay(event.target.value)}>{days.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Start<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
        <label>End<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        <label>Room<input value={room} onChange={(event) => setRoom(event.target.value)} maxLength={80} /></label>
        <label>Building<input value={building} onChange={(event) => setBuilding(event.target.value)} maxLength={80} /></label>
        <button className="academic-primary" disabled={busy || !selectedSubject || !selectedPeriod || !sectionName || !facultyId}><Plus size={16} /> Add timetable slot</button>
      </form>
      <div className="academic-admin-list">{(timetableEntries.value ?? []).map((entry) => <article key={entry.id}>
        <span><strong>{entry.day_of_week} · {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)} · {entry.subject_code} {entry.subject_name}</strong><small>{entry.faculty_name || 'Faculty'} · Section {entry.section} · {[entry.building, entry.room].filter(Boolean).join(' · ') || 'Room not assigned'}</small></span>
        <select aria-label={`Status for ${entry.subject_code} timetable slot`} value={entry.status ?? 'active'} disabled={busy} onChange={(event) => void updateRecord(() => setTimetableEntryStatus(entry.id, event.target.value as 'active' | 'cancelled' | 'archived'), 'Timetable status updated.')}>
          <option value="active">Active</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option>
        </select>
      </article>)}</div>
    </section>
    <section className="academic-section"><h2>Attendance thresholds</h2>
      <p className="academic-muted">These settings control student-facing warnings and attendance calculations; they do not change recorded attendance statuses.</p>
      <form className="academic-form academic-admin-form" onSubmit={(event) => { event.preventDefault(); void updateRecord(() => updateAttendanceSettings(attendanceSettingsForm), 'Attendance settings saved.') }}>
        <label>Recommended threshold (%)<input type="number" min={0} max={100} required value={attendanceSettingsForm.recommended_threshold} onChange={(event) => setAttendanceSettings((current) => ({ ...(current ?? settings.value ?? defaultAttendanceSettings), recommended_threshold: Number(event.target.value) }))} /></label>
        <label>Warning threshold (%)<input type="number" min={0} max={100} required value={attendanceSettingsForm.warning_threshold} onChange={(event) => setAttendanceSettings((current) => ({ ...(current ?? settings.value ?? defaultAttendanceSettings), warning_threshold: Number(event.target.value) }))} /></label>
        <label>Critical threshold (%)<input type="number" min={0} max={100} required value={attendanceSettingsForm.critical_threshold} onChange={(event) => setAttendanceSettings((current) => ({ ...(current ?? settings.value ?? defaultAttendanceSettings), critical_threshold: Number(event.target.value) }))} /></label>
        <label>Late attendance weight (0–1)<input type="number" min={0} max={1} step={0.05} required value={attendanceSettingsForm.late_weight} onChange={(event) => setAttendanceSettings((current) => ({ ...(current ?? settings.value ?? defaultAttendanceSettings), late_weight: Number(event.target.value) }))} /></label>
        <label className="academic-checkbox"><input type="checkbox" checked={attendanceSettingsForm.excused_counts_as_eligible} onChange={(event) => setAttendanceSettings((current) => ({ ...(current ?? settings.value ?? defaultAttendanceSettings), excused_counts_as_eligible: event.target.checked }))} /> Count excused sessions in attendance denominator</label>
        <button className="academic-primary" disabled={busy || settings.loading}>Save attendance settings</button>
      </form>
    </section>
  </AcademicFrame>
}
