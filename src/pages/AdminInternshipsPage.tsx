import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import CompanyLogo from '../components/career/CompanyLogo'
import { deleteInternship, getCareerAnalytics, getCareerChartData, getAdminInternships, moderateInternship, type CareerAnalytics, type CareerChartData, type DeadlineWindow } from '../services/internshipService'
import { getCompanies } from '../services/companyService'
import { getBranches } from '../services/subjectService'
import type { Branch, Company, Internship, InternshipStatus, WorkMode } from '../types'

const zeroStats: CareerAnalytics = { total_opportunities: 0, published_opportunities: 0, pending_review: 0, closed_opportunities: 0, total_applications: 0, interviews: 0, selected_students: 0 }
const emptyCharts: CareerChartData = { applications_by_month: [], internships_by_work_mode: [], internships_by_type: [], application_pipeline: [] }

export default function AdminInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [stats, setStats] = useState(zeroStats)
  const [charts, setCharts] = useState(emptyCharts)
  const [status, setStatus] = useState<InternshipStatus | ''>('pending_review')
  const [companyId, setCompanyId] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')
  const [paid, setPaid] = useState('')
  const [branchId, setBranchId] = useState('')
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineWindow | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejecting, setRejecting] = useState('')
  const [reason, setReason] = useState('')

  const load = useCallback(async () => {
    try {
      const [rows, statsData, chartData, companyRows, branchRows] = await Promise.all([
        getAdminInternships({ status: status || undefined, companyId: companyId || undefined, workMode: workMode || undefined, paid: paid === '' ? undefined : paid === 'true', branchId: branchId || undefined, deadlineWindow: deadlineWindow || undefined }),
        getCareerAnalytics(), getCareerChartData(), getCompanies(true), getBranches(true),
      ])
      setInternships(rows); setStats(statsData); setCharts(chartData); setCompanies(companyRows); setBranches(branchRows); setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load career administration.') }
    finally { setLoading(false) }
  }, [branchId, companyId, deadlineWindow, paid, status, workMode])

  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  const refresh = async () => { setLoading(true); await load() }
  const moderate = async (id: string, nextStatus: 'published' | 'rejected' | 'closed' | 'archived', rejectionReason?: string) => {
    try { await moderateInternship(id, nextStatus, rejectionReason); setRejecting(''); await refresh() }
    catch (moderationError) { setError(moderationError instanceof Error ? moderationError.message : 'Unable to update listing.') }
  }
  const remove = async (internship: Internship) => {
    if (!window.confirm(`Delete “${internship.role_title}” and its tracking records?`)) return
    try { await deleteInternship(internship.id); await refresh() }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete listing.') }
  }
  const maxBar = Math.max(1, ...charts.applications_by_month.map((row) => row.count))

  return <PageContainer className="career-page-shell"><div className="career-page-inner">
    <header className="career-hub-header"><div><p className="eyebrow">Administration</p><h1>Internship Management</h1><p>Moderate submissions, manage listings and review actual activity.</p></div><div className="career-header-actions"><Link to="/admin/companies" className="career-secondary-button">Manage Companies</Link><Link to="/admin/internships/create" className="career-primary-button">Add Opportunity</Link></div></header>
    {error && <p className="career-form-error" role="alert">{error}</p>}
    <div className="career-admin-stats">{[['Total opportunities', stats.total_opportunities], ['Published', stats.published_opportunities], ['Pending review', stats.pending_review], ['Closed', stats.closed_opportunities], ['Applications', stats.total_applications], ['Interviews', stats.interviews], ['Selected', stats.selected_students]].map(([label, value]) => <div className="career-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="career-analytics-grid"><article className="career-description-panel"><h2>Applications over time</h2>{charts.applications_by_month.length ? <div className="career-chart-bars">{charts.applications_by_month.map((row) => <div key={row.month}><span style={{ height: `${Math.max(6, (row.count / maxBar) * 100)}%` }} title={`${row.count} applications`} /><small>{row.month.slice(5)}</small></div>)}</div> : <p className="career-muted">No application activity yet.</p>}</article><article className="career-description-panel"><h2>Opportunities by work mode</h2><div className="career-data-bars">{charts.internships_by_work_mode.map((row) => <div key={row.label}><span>{row.label.replace('_', '-')}</span><strong>{row.count}</strong></div>)}{!charts.internships_by_work_mode.length && <p className="career-muted">No opportunity data.</p>}</div></article><article className="career-description-panel"><h2>Opportunities by type</h2><div className="career-data-bars">{charts.internships_by_type.map((row) => <div key={row.label}><span>{row.label.replaceAll('_', ' ')}</span><strong>{row.count}</strong></div>)}{!charts.internships_by_type.length && <p className="career-muted">No opportunity data.</p>}</div></article><article className="career-description-panel"><h2>Application pipeline</h2><div className="career-data-bars">{charts.application_pipeline.map((row) => <div key={row.label}><span>{row.label}</span><strong>{row.count}</strong></div>)}{!charts.application_pipeline.length && <p className="career-muted">No applications yet.</p>}</div></article></section>
    <section className="career-admin-filters"><label><span>Status</span><select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as InternshipStatus | '') }}><option value="">All statuses</option>{(['draft', 'pending_review', 'published', 'rejected', 'closed', 'archived'] as InternshipStatus[]).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label><span>Company</span><select value={companyId} onChange={(event) => { setLoading(true); setCompanyId(event.target.value) }}><option value="">All companies</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.is_demo ? ' · DEMO' : ''}</option>)}</select></label><label><span>Branch</span><select value={branchId} onChange={(event) => { setLoading(true); setBranchId(event.target.value) }}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label><span>Work mode</span><select value={workMode} onChange={(event) => { setLoading(true); setWorkMode(event.target.value as WorkMode | '') }}><option value="">All modes</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label><label><span>Compensation</span><select value={paid} onChange={(event) => { setLoading(true); setPaid(event.target.value) }}><option value="">All</option><option value="true">Paid</option><option value="false">Unpaid</option></select></label><label><span>Deadline</span><select value={deadlineWindow} onChange={(event) => { setLoading(true); setDeadlineWindow(event.target.value as DeadlineWindow | '') }}><option value="">Any deadline</option><option value="week">This week</option><option value="month">This month</option><option value="later">Later</option></select></label></section>
    {loading ? <div className="career-skeleton" /> : <div className="career-admin-list">{internships.map((internship) => <article className="career-admin-internship-row" key={internship.id}><CompanyLogo name={internship.company?.name ?? 'Company'} logoUrl={internship.company?.logo_url} /><div><strong>{internship.role_title}</strong><span>{internship.company?.name} · {internship.location} · {internship.work_mode.replace('_', '-')}</span><small>{internship.status.replaceAll('_', ' ')} · {internship.application_deadline ? new Date(internship.application_deadline).toLocaleDateString() : 'No deadline'}{internship.is_demo ? ' · DEMO OPPORTUNITY' : ''}</small></div><div className="career-admin-actions"><Link to={`/internships/${internship.id}`} className="career-view-link">View</Link><Link to={`/admin/internships/${internship.id}/edit`} className="career-secondary-button">Edit</Link>{internship.status !== 'published' && <button type="button" className="career-primary-button" onClick={() => void moderate(internship.id, 'published')}>Approve</button>}<button type="button" className="career-secondary-button" onClick={() => { setRejecting(internship.id); setReason('') }}>Reject</button>{internship.status === 'published' && <button type="button" className="career-secondary-button" onClick={() => void moderate(internship.id, 'closed')}>Close</button>}{internship.status !== 'archived' && <button type="button" className="career-secondary-button" onClick={() => void moderate(internship.id, 'archived')}>Archive</button>}<button type="button" className="career-secondary-button" onClick={() => void remove(internship)}>Delete</button></div>{rejecting === internship.id && <form className="career-rejection-form" onSubmit={(event) => { event.preventDefault(); void moderate(internship.id, 'rejected', reason) }}><label><span>Rejection reason</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label><button type="submit" className="career-secondary-button">Confirm rejection</button></form>}</article>)}{!internships.length && <div className="career-empty-state">No internships match these filters.</div>}</div>}
  </div></PageContainer>
}
