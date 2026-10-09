import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import { getFacultyResources } from '../services/resourceService'
import { getFacultyInternships } from '../services/internshipService'
import { getMyTimetable } from '../services/academicService'
import TodayClasses from '../components/academics/TodayClasses'
import type { Resource } from '../types'
import type { TimetableEntry } from '../types/academic'

export default function FacultyDashboardPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [internships, setInternships] = useState<Awaited<ReturnType<typeof getFacultyInternships>>>([])
  const [resourceError, setResourceError] = useState('')
  const [internshipError, setInternshipError] = useState('')
  const [todaySchedule, setTodaySchedule] = useState<TimetableEntry[]>([])
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleLoading, setScheduleLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getFacultyResources().then((rows) => {
      if (active) setResources(rows)
    }).catch((error: unknown) => {
      if (active) setResourceError(error instanceof Error ? error.message : 'Unable to load your resources.')
    })
    void getFacultyInternships().then((rows) => {
      if (active) setInternships(rows)
    }).catch((error: unknown) => {
      if (active) setInternshipError(error instanceof Error ? error.message : 'Unable to load your internship submissions.')
    })
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
    void getMyTimetable().then((entries) => {
      if (active) {
        setTodaySchedule(entries.filter((entry) => entry.day_of_week === weekday))
        setScheduleLoading(false)
      }
    }).catch((error: unknown) => {
      if (active) {
        setScheduleError(error instanceof Error ? error.message : 'Unable to load your timetable.')
        setScheduleLoading(false)
      }
    })
    return () => { active = false }
  }, [user?.id])

  const pendingCount = resources.filter((resource) => resource.status === 'pending_review').length
  const publishedCount = resources.filter((resource) => resource.status === 'published').length

  return (
    <PageContainer className="placeholder-shell">
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: 1.8, opacity: 0.7, margin: 0 }}>Faculty portal</p>
            <h1 style={{ margin: '0.5rem 0 0' }}>Faculty overview</h1>
          </div>
          <Link to="/profile" className="primary-link">Update profile</Link>
        </div>
        {resourceError && <p className="resource-inline-error" role="alert">{resourceError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Resources Shared', value: String(resources.length) },
            { label: 'Published Resources', value: String(publishedCount) },
            { label: 'Pending Resource Reviews', value: String(pendingCount) },
            { label: 'Internship Submissions', value: String(internships.length) },
          ].map((metric) => (
            <div key={metric.label} style={{ background: 'rgba(16,24,40,0.62)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1rem 1.2rem' }}>
              <p style={{ margin: 0, opacity: 0.7 }}>{metric.label}</p>
              <h3 style={{ margin: '0.5rem 0 0', fontSize: '2rem' }}>{metric.value}</h3>
            </div>
          ))}
        </div>

        <section className="learning-hub faculty-resource-overview"><div className="learning-hub-heading"><div><p className="eyebrow">Faculty library</p><h2>My Resources</h2></div><Link to="/faculty/resources" className="resource-action-button">Manage resources</Link></div>
          {resourceError && <p className="resource-inline-error" role="alert">{resourceError}</p>}
          <div className="resource-status-summary"><div><span>Total uploads</span><strong>{resources.length}</strong></div><div><span>Published</span><strong>{publishedCount}</strong></div><div><span>Pending review</span><strong>{pendingCount}</strong></div></div>
          <div className="learning-hub-list">{resources.slice(0, 3).map((resource) => <Link to={`/resources/${resource.id}`} className="learning-hub-row" key={resource.id}><span><strong>{resource.title}</strong><small>{resource.subject?.subject_name} · {resource.status.replaceAll('_', ' ')}</small></span></Link>)}{!resourceError && resources.length === 0 && <p className="resource-empty-compact">Your uploaded resources will appear here.</p>}</div>
        </section>

        <section className="learning-hub"><div className="learning-hub-heading"><div><p className="eyebrow">Career opportunities</p><h2>Internship submissions</h2></div><Link to="/faculty/internships" className="resource-action-button">My Submissions</Link></div><p className="career-muted">Submit verified opportunities for admin review before they are visible to students.</p><Link to="/faculty/internships/create" className="career-view-link">Submit an opportunity</Link></section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <TodayClasses entries={todaySchedule} loading={scheduleLoading} error={scheduleError} timetablePath="/faculty/timetable" attendancePath="/faculty/attendance" />

          <section style={{ background: 'rgba(16,24,40,0.62)', borderRadius: 18, padding: '1rem 1.2rem' }}>
            <div className="learning-hub-heading"><h3>Recent submissions</h3><Link to="/faculty/internships">Manage</Link></div>
            {internshipError && <p className="resource-inline-error" role="alert">{internshipError}</p>}
            {internships.slice(0, 3).map((internship) => <div key={internship.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.75rem' }}><strong>{internship.role_title}</strong><p style={{ margin: '0.2rem 0 0', opacity: 0.7 }}>{internship.status.replaceAll('_', ' ')}</p></div>)}
            {!internships.length && !internshipError && <p style={{ opacity: 0.8 }}>No internship submissions yet.</p>}
          </section>
        </div>
      </div>
    </PageContainer>
  )
}
