import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import LearningHub from '../components/resources/LearningHub'
import TodayClasses from '../components/academics/TodayClasses'
const StudentCareerSnapshot = lazy(() => import('../components/career/StudentCareerSnapshot'))
import { useAuth } from '../contexts/AuthContext'
import { getStudentDashboardData } from '../services/dashboardService'
import { getMyAttendanceSummary, getMyTimetable } from '../services/academicService'
import { getAnnouncements, hasAcknowledgedAnnouncement, type AnnouncementRecord } from '../services/announcementService'
import type { AttendanceSummary, TimetableEntry } from '../types/academic'

export default function StudentDashboardPage() {
  const { profile, user } = useAuth()
  const [data, setData] = useState<Awaited<ReturnType<typeof getStudentDashboardData>> | null>(null)
  const [error, setError] = useState('')
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([])
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([])
  const [attendanceError, setAttendanceError] = useState('')
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([])
  const [acknowledgedAnnouncementIds, setAcknowledgedAnnouncementIds] = useState<string[]>([])
  const [announcementsError, setAnnouncementsError] = useState('')

  useEffect(() => {
    let active = true
    if (!user?.id) return
    void getStudentDashboardData(user.id).then((dashboard) => {
      if (active) setData(dashboard)
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your dashboard.')
    })
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
    void getMyTimetable().then((entries) => {
      if (active) {
        setTodaySchedule(entries.filter((entry) => entry.day_of_week === weekday))
        setScheduleLoading(false)
      }
    }).catch((caught: unknown) => {
      if (active) {
        setScheduleError(caught instanceof Error ? caught.message : 'Unable to load your timetable.')
        setScheduleLoading(false)
      }
    })
    void getMyAttendanceSummary().then((summary) => {
      if (active) setAttendanceSummary(summary)
    }).catch((caught: unknown) => {
      if (active) setAttendanceError(caught instanceof Error ? caught.message : 'Unable to load attendance overview.')
    })
    void getAnnouncements(0).then((items) => {
      const recentAnnouncements = items.slice(0, 3)
      if (active) setAnnouncements(recentAnnouncements)
      return Promise.all(recentAnnouncements
        .filter((announcement) => announcement.requires_acknowledgement)
        .map(async (announcement) => [announcement.id, await hasAcknowledgedAnnouncement(announcement.id)] as const))
    }).catch((caught: unknown) => {
      if (active) setAnnouncementsError(caught instanceof Error ? caught.message : 'Unable to load announcements.')
    }).then((acknowledgements) => {
      if (active && acknowledgements) {
        setAcknowledgedAnnouncementIds(acknowledgements.filter(([, acknowledged]) => acknowledged).map(([id]) => id))
      }
    })
    return () => { active = false }
  }, [user?.id])

  return (
    <PageContainer className="placeholder-shell">
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: 1.8, opacity: 0.7, margin: 0 }}>Student portal</p>
            <h1 style={{ margin: '0.5rem 0 0' }}>Welcome back, {profile?.full_name || 'Student'}</h1>
          </div>
          <Link to="/profile" className="primary-link">View profile</Link>
        </div>
        {error && <p className="resource-inline-error" role="alert">{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {(data?.metrics ?? [
            { label: 'Registered Events', value: '—' },
            { label: 'Upcoming Campus Events', value: '—' },
            { label: 'Saved Internships', value: '—' },
            { label: 'Unread Notifications', value: '—' },
          ]).map((metric) => (
            <div key={metric.label} style={{ background: 'rgba(16,24,40,0.62)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1rem 1.2rem' }}>
              <p style={{ margin: 0, opacity: 0.7 }}>{metric.label}</p>
              <h3 style={{ margin: '0.5rem 0 0', fontSize: '2rem' }}>{metric.value}</h3>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <TodayClasses entries={todaySchedule} loading={scheduleLoading} error={scheduleError} timetablePath="/timetable" />

          <section style={{ background: 'rgba(16,24,40,0.62)', borderRadius: 18, padding: '1rem 1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <h3>Announcements</h3><Link to="/announcements">View all</Link>
            </div>
            {announcementsError && <p className="resource-inline-error" role="alert">{announcementsError}</p>}
            {announcements.length ? announcements.map((announcement) => (
              <p key={announcement.id}>
                <Link to={`/announcements/${announcement.id}`}>{announcement.title}</Link>
                {announcement.is_pinned && <span className="p10-chip" style={{ marginLeft: 8 }}>Pinned</span>}
                {announcement.priority === 'urgent' && <span className="p10-chip p10-priority-urgent" style={{ marginLeft: 8 }}>Urgent</span>}
                {announcement.requires_acknowledgement && <span className="p10-chip" style={{ marginLeft: 8 }}>
                  {acknowledgedAnnouncementIds.includes(announcement.id) ? 'Acknowledged' : 'Acknowledgement required'}
                </span>}
              </p>
            )) : !announcementsError && <p style={{ opacity: 0.8 }}>No announcements are available for your account right now.</p>}
          </section>
        </div>
        {attendanceError && <p className="resource-inline-error" role="alert">{attendanceError}</p>}
        <section className="academic-section">
          <div className="learning-hub-heading"><h2>Academic overview</h2><Link to="/academics">My subjects</Link></div>
          <div className="academic-card-list">
            {attendanceSummary.map((item) => <article className="academic-card academic-attendance-card" key={item.subject_id}>
              <div><p className="academic-card-code">{item.subject_code}</p><h2>{item.subject_name}</h2><p>{item.attended} attended · {item.eligible} eligible sessions</p></div>
              <div className="academic-attendance-rate"><strong>{item.percentage === null ? '—' : `${item.percentage}%`}</strong><span>Threshold {item.threshold}%</span></div>
            </article>)}
            {!attendanceSummary.length && !attendanceError && <p className="academic-empty">Attendance progress appears here after a faculty member records completed class sessions.</p>}
          </div>
          <div className="dashboard-quick-actions"><Link to="/academics" className="resource-action-button">Academic subjects</Link><Link to="/attendance" className="resource-secondary-button">Attendance trends</Link><Link to="/timetable" className="resource-secondary-button">Weekly timetable</Link></div>
        </section>

        <div className="dashboard-quick-actions"><Link to="/resources" className="resource-action-button">Browse Resources</Link><Link to="/resources/saved" className="resource-secondary-button">Saved Resources</Link></div>
        <LearningHub />
        <Suspense fallback={<div className="career-skeleton" aria-label="Loading career snapshot" />}><StudentCareerSnapshot /></Suspense>
      </div>
    </PageContainer>
  )
}
