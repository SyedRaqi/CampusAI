import { useCallback, useEffect, useState } from 'react'
import PageContainer from '../components/PageContainer'
import ResourceModerationTable from '../components/resources/ResourceModerationTable'
import ResourceStats from '../components/resources/ResourceStats'
import { deleteResource, getAdminResources, getResourceAnalytics, getResourceReports, moderateResource, updateResourceReport, type ResourceAnalytics } from '../services/resourceService'
import { getBranches, getResourceTypes, getSemesters, getSubjects, type ResourceTypeOption } from '../services/subjectService'
import type { Branch, Resource, ResourceReport, ResourceStatus, Semester, Subject } from '../types'

const emptyAnalytics: ResourceAnalytics = { total_resources: 0, published_resources: 0, pending_resources: 0, total_downloads: 0, total_views: 0, most_downloaded_title: null }

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [reports, setReports] = useState<ResourceReport[]>([])
  const [analytics, setAnalytics] = useState<ResourceAnalytics>(emptyAnalytics)
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [types, setTypes] = useState<ResourceTypeOption[]>([])
  const [status, setStatus] = useState<ResourceStatus | ''>('pending_review')
  const [branchId, setBranchId] = useState('')
  const [semester, setSemester] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [type, setType] = useState('')
  const [tab, setTab] = useState<'resources' | 'reports'>('resources')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [rows, reportRows, stats] = await Promise.all([
        getAdminResources({ status: status || undefined, branchId: branchId || undefined, semester: semester ? Number(semester) : undefined, subjectId: subjectId || undefined, resourceType: type || undefined }),
        getResourceReports(), getResourceAnalytics(),
      ])
      setResources(rows)
      setReports(reportRows)
      setAnalytics(stats)
      setError('')
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load resource administration.') }
    finally { setLoading(false) }
  }, [branchId, semester, status, subjectId, type])

  useEffect(() => {
    let active = true
    Promise.all([getBranches(), getSemesters(), getSubjects(), getResourceTypes()])
      .then(([branchRows, semesterRows, subjectRows, typeRows]) => { if (active) { setBranches(branchRows); setSemesters(semesterRows); setSubjects(subjectRows); setTypes(typeRows) } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load filters.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const refresh = async () => { setLoading(true); await load() }
  const handleModerate = async (resourceId: string, nextStatus: 'published' | 'rejected' | 'archived', reason?: string) => { await moderateResource(resourceId, nextStatus, reason); await refresh() }
  const handleDelete = async (resource: Resource) => { if (window.confirm(`Delete “${resource.title}” and its file?`)) { await deleteResource(resource.id); await refresh() } }

  return (
    <PageContainer className="resources-page-shell"><div className="resources-page-inner">
      <header className="resources-library-header"><div><p className="eyebrow">Administration</p><h1>Resource Management</h1><p>Moderate uploads, review reports, and monitor real library activity.</p></div></header>
      {error && <p className="resource-inline-error" role="alert">{error}</p>}
      <ResourceStats analytics={analytics} />
      {analytics.most_downloaded_title && <p className="resource-most-popular">Most downloaded: <strong>{analytics.most_downloaded_title}</strong></p>}
      <div className="learning-hub-tabs" role="tablist" aria-label="Resource administration views"><button type="button" role="tab" aria-selected={tab === 'resources'} className={tab === 'resources' ? 'active' : ''} onClick={() => setTab('resources')}>Resources</button><button type="button" role="tab" aria-selected={tab === 'reports'} className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Reports ({reports.filter((report) => report.status === 'open').length})</button></div>
      {tab === 'resources' ? <>
        <div className="saved-resource-filters">
          <label><span>Status</span><select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as ResourceStatus | '') }}><option value="">All statuses</option><option value="pending_review">Pending review</option><option value="published">Published</option><option value="draft">Drafts</option><option value="rejected">Rejected</option><option value="archived">Archived</option></select></label>
          <label><span>Resource type</span><select value={type} onChange={(event) => { setLoading(true); setType(event.target.value) }}><option value="">All types</option>{types.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
          <label><span>Branch</span><select value={branchId} onChange={(event) => { setLoading(true); setBranchId(event.target.value) }}><option value="">All branches</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>Semester</span><select value={semester} onChange={(event) => { setLoading(true); setSemester(event.target.value) }}><option value="">All semesters</option>{semesters.map((item) => <option key={item.number} value={item.number}>{item.label}</option>)}</select></label>
          <label><span>Subject</span><select value={subjectId} onChange={(event) => { setLoading(true); setSubjectId(event.target.value) }}><option value="">All subjects</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.subject_name}</option>)}</select></label>
        </div>
        {loading ? <div className="resource-table-skeleton" /> : <ResourceModerationTable resources={resources} onModerate={handleModerate} onDelete={handleDelete} />}
      </> : <div className="resource-report-list">{reports.map((report) => <article className="resource-report-row" key={report.id}><div><strong>{report.resource?.title ?? 'Resource removed'}</strong><span>{report.reason.replaceAll('_', ' ')} · {report.status}</span><p>{report.description || 'No additional details.'}</p></div><div className="resource-report-actions"><select aria-label={`Update report status for ${report.resource?.title ?? 'resource'}`} value={report.status} onChange={(event) => void updateResourceReport(report.id, event.target.value as ResourceReport['status']).then(refresh).catch((updateError: unknown) => setError(updateError instanceof Error ? updateError.message : 'Unable to update report.'))}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></div></article>)}{!reports.length && <p className="resource-empty-state">No resource reports have been submitted.</p>}</div>}
    </div></PageContainer>
  )
}
