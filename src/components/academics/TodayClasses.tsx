import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TimetableEntry } from '../../types/academic'
import '../../pages/academics.css'

function minutes(value: string): number {
  const [hours, mins] = value.split(':').map(Number)
  return hours * 60 + mins
}

export default function TodayClasses({
  entries,
  loading,
  error,
  timetablePath,
  attendancePath,
}: {
  entries: TimetableEntry[]
  loading: boolean
  error: string
  timetablePath: string
  attendancePath?: string
}) {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }
    updateTime()
    const timer = window.setInterval(updateTime, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const current = currentMinutes === null ? undefined : entries.find((entry) =>
    minutes(entry.start_time) <= currentMinutes && minutes(entry.end_time) > currentMinutes
  )
  const next = currentMinutes === null ? undefined : entries.find((entry) => minutes(entry.start_time) > currentMinutes)
  const remaining = currentMinutes === null ? entries.length : entries.filter((entry) => minutes(entry.end_time) > currentMinutes).length

  return <section className="learning-hub today-classes">
    <div className="learning-hub-heading"><h3>Today's Classes</h3><Link to={timetablePath}>Full timetable</Link></div>
    {error && <p className="resource-inline-error" role="alert">{error}</p>}
    {loading && <p className="career-muted">Loading today's classes…</p>}
    {!loading && !error && !entries.length && <p className="career-muted">No classes are scheduled for today.</p>}
    {!loading && !error && entries.length > 0 && <>
      {current && <p className="academic-class-state"><strong>In progress</strong><span>{current.subject_code} · {current.subject_name} · {current.start_time.slice(0, 5)}–{current.end_time.slice(0, 5)} · {current.room || 'Room not assigned'}</span></p>}
      {current && next && <p className="academic-class-state"><strong>Next class</strong><span>{next.subject_code} · {next.subject_name} · {next.start_time.slice(0, 5)}–{next.end_time.slice(0, 5)} · {next.room || 'Room not assigned'}</span></p>}
      {!current && next && <p className="academic-class-state"><strong>Next class</strong><span>{next.subject_code} · {next.subject_name} · {next.start_time.slice(0, 5)}–{next.end_time.slice(0, 5)} · {next.room || 'Room not assigned'}</span></p>}
      {!current && !next && <p className="career-muted">All scheduled classes for today have finished.</p>}
      <p className="academic-muted">{remaining} {remaining === 1 ? 'class' : 'classes'} remaining today</p>
      <div className="academic-today-list">{entries.map((entry) => <article key={entry.id} className="academic-today-row">
        <time>{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</time>
        <span><strong>{entry.subject_code} · {entry.subject_name}</strong><small>{entry.faculty_name || `Section ${entry.section}`} · {entry.room || 'Room not assigned'}</small></span>
        {attendancePath && <Link to={attendancePath}>Attendance</Link>}
      </article>)}</div>
    </>}
    <div className="dashboard-quick-actions"><Link to={timetablePath} className="resource-action-button">View timetable</Link>
      {attendancePath && <Link to={attendancePath} className="resource-secondary-button">Take attendance</Link>}</div>
  </section>
}
