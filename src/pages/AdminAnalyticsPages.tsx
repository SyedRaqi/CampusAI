import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, BarChart3, CalendarDays, ClipboardList, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import {
  getAuditLogs,
  getPhase10Analytics,
  getPhase10AnalyticsTrend,
  type AnalyticsFilters,
  type AuditLogRecord,
  type Phase10Analytics,
  type AnalyticsTrendPoint,
} from '../services/analyticsService'
import './phase10.css'

const metricLabels: Record<string, string> = {
  users: 'New registered users',
  students: 'New students',
  faculty: 'New faculty',
  resources: 'Resources published',
  published_events: 'Events published',
  event_registrations: 'Event registrations',
  active_internships: 'Internships published',
  internship_applications: 'Applications',
  active_clubs: 'Active clubs created',
  active_teams: 'Active project teams',
  open_support_tickets: 'Open support tickets',
  published_announcements: 'Announcements published',
  notifications_created: 'Notifications created',
  notifications_read: 'Notifications read',
  ai_tokens_used: 'AI tokens used',
  attendance_records: 'Attendance records',
}

const trendModules = [
  ['users', 'New registered users'],
  ['resources', 'Published resources'],
  ['events', 'Published events'],
  ['internships', 'Published internships'],
  ['support', 'Support tickets'],
  ['announcements', 'Published announcements'],
  ['ai', 'AI tokens used'],
  ['attendance', 'Attendance records'],
] as const

const initialDateRange = (() => {
  const today = new Date()
  const toDate = today.toISOString().slice(0, 10)
  today.setDate(today.getDate() - 29)
  return { fromDate: today.toISOString().slice(0, 10), toDate }
})()

export function AdminAnalyticsPage() {
  const today = initialDateRange.toDate
  const [filters, setFilters] = useState<AnalyticsFilters>(initialDateRange)
  const [trendModule, setTrendModule] = useState<string>('users')
  const [metrics, setMetrics] = useState<Phase10Analytics | null>(null)
  const [trend, setTrend] = useState<AnalyticsTrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(true)
  const [error, setError] = useState('')
  const [trendError, setTrendError] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    void getPhase10Analytics(filters).then((data) => { if (active) setMetrics(data) })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load analytics.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  useEffect(() => {
    let active = true
    setTrendLoading(true); setTrendError('')
    void getPhase10AnalyticsTrend(filters, trendModule).then((data) => { if (active) setTrend(data) })
      .catch((caught: unknown) => { if (active) setTrendError(caught instanceof Error ? caught.message : 'Unable to load the analytics trend.') })
      .finally(() => { if (active) setTrendLoading(false) })
    return () => { active = false }
  }, [filters, trendModule])

  const displayed = Object.entries(metrics ?? {}).filter(([key]) => key !== 'faculty' || !filters.semester)
  const maxValue = Math.max(1, ...displayed.map(([, value]) => Number(value) || 0))
  const trendMax = Math.max(1, ...trend.map((point) => Number(point.value) || 0))
  const trendTitle = trendModules.find(([key]) => key === trendModule)?.[1] ?? trendModule
  return <PageContainer className="phase10-shell">
    <header className="p10-page-heading"><div><p className="p10-eyebrow">Administration · Insights</p><h1>Campus analytics</h1><p>Aggregated module activity from verified database records. No private message or AI conversation content is included.</p></div><Link to="/admin/audit-logs" className="p10-button p10-button-secondary"><ClipboardList size={16} /> Audit logs</Link></header>
    <section className="p10-analytics-filters">
      <label>From<input type="date" value={filters.fromDate} max={filters.toDate} onChange={(event) => setFilters((current) => ({ ...current, fromDate: event.target.value }))} /></label>
      <label>To<input type="date" value={filters.toDate} min={filters.fromDate} max={today} onChange={(event) => setFilters((current) => ({ ...current, toDate: event.target.value }))} /></label>
      <label>Department<input value={filters.department ?? ''} maxLength={120} placeholder="All departments" onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value || undefined }))} /></label>
      <label>Semester<select value={filters.semester ?? ''} onChange={(event) => setFilters((current) => ({ ...current, semester: event.target.value ? Number(event.target.value) : undefined }))}><option value="">All semesters</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => <option key={semester}>{semester}</option>)}</select></label>
      <label>Trend module<select value={trendModule} onChange={(event) => setTrendModule(event.target.value)}>{trendModules.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
    </section>
    {error && <p className="p10-error" role="alert">{error}</p>}
    {loading && <p className="p10-loading">Loading aggregated metrics…</p>}
    {metrics && !loading && <>
      <div className="p10-metric-grid">
        {displayed.map(([key, value]) => <article className="p10-metric-card" key={key}><span>{key === 'users' ? <Users size={17} /> : key.includes('event') ? <CalendarDays size={17} /> : <Activity size={17} />}</span><strong>{Number(value).toLocaleString()}</strong><small>{metricLabels[key] ?? key.replaceAll('_', ' ')}</small></article>)}
      </div>
      <section className="p10-chart-card"><div className="p10-section-heading"><div><p className="p10-eyebrow">Selected period</p><h2>Module activity snapshot</h2></div><BarChart3 size={20} /></div>
        <div className="p10-bars">{displayed.map(([key, value]) => <div className="p10-bar-row" key={key}><span>{metricLabels[key] ?? key.replaceAll('_', ' ')}</span><div><i style={{ width: `${Math.min(100, Math.max(Number(value) > 0 ? 4 : 0, (Number(value) / maxValue) * 100))}%` }} /></div><strong>{Number(value).toLocaleString()}</strong></div>)}</div>
        <div className="p10-section-heading p10-trend-heading"><div><p className="p10-eyebrow">Month-by-month</p><h2>{trendTitle}</h2></div></div>
        {trendError && <p className="p10-error" role="alert">{trendError}</p>}
        {trendLoading ? <p className="p10-loading">Loading monthly trend…</p> : trend.length ? <div className="p10-bars" aria-label={`${trendTitle} by month`}>
          {trend.map((point) => <div className="p10-bar-row" key={`${point.period_start}-${point.metric}`}>
            <span>{new Date(`${point.period_start}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            <div><i style={{ width: `${Math.min(100, Math.max(Number(point.value) > 0 ? 4 : 0, (Number(point.value) / trendMax) * 100))}%` }} /></div>
            <strong>{Number(point.value).toLocaleString()}</strong>
          </div>)}
        </div> : <p className="p10-muted">No activity is recorded for this selection.</p>}
        <p className="p10-muted">Department and semester filters are applied by the database to profile, resource, AI usage and attendance metrics where the underlying records support those filters. Module totals use actual stored records.</p>
      </section>
    </>}
  </PageContainer>
}

export function AuditLogPage() {
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [records, setRecords] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load(requestedPage = page) {
    setLoading(true); setError('')
    try {
      const data = await getAuditLogs({ page: requestedPage, actor, action, targetType, fromDate, toDate })
      setRecords(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { setPage(0); void load(0) }, [actor, action, targetType, fromDate, toDate])
  return <PageContainer className="phase10-shell">
    <Link to="/admin/analytics" className="p10-back-link"><ArrowLeft size={15} /> Campus analytics</Link>
    <header className="p10-page-heading"><div><p className="p10-eyebrow">Administration · Governance</p><h1>Audit logs</h1><p>Review recorded administrative and support workflow actions. Audit entries are read-only.</p></div></header>
    <section className="p10-audit-filters"><label>Actor user ID<input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="Filter by actor UUID" /></label><label>Action contains<input value={action} onChange={(event) => setAction(event.target.value)} placeholder="e.g. update_announcement" /></label><label>Target type<input value={targetType} onChange={(event) => setTargetType(event.target.value)} placeholder="e.g. support_ticket" /></label><label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label></section>
    {error && <p className="p10-error" role="alert">{error}</p>}
    <div className="p10-audit-table-wrap"><table className="p10-audit-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Target ID</th></tr></thead><tbody>
      {records.map((record) => <tr key={record.id}><td>{new Date(record.created_at).toLocaleString()}</td><td>{record.actor_id ?? 'System'}</td><td><span className="p10-chip">{record.action}</span></td><td>{record.target_type}</td><td>{record.target_id ?? '—'}</td></tr>)}
      {!loading && records.length === 0 && <tr><td colSpan={5}>No audit records match these filters.</td></tr>}
    </tbody></table>{loading && <p className="p10-loading">Loading audit logs…</p>}</div>
    <div className="p10-pagination"><button type="button" disabled={page === 0 || loading} onClick={() => { const next = page - 1; setPage(next); void load(next) }}>Previous</button><span>Page {page + 1}</span><button type="button" disabled={records.length < 30 || loading} onClick={() => { const next = page + 1; setPage(next); void load(next) }}>Next <ArrowRight size={14} /></button></div>
  </PageContainer>
}
