import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import ResourceGrid from '../components/resources/ResourceGrid'
import { getSavedResources } from '../services/bookmarkService'
import { getBranches, getResourceTypes, getSemesters, getSubjects, type ResourceTypeOption } from '../services/subjectService'
import type { Branch, Resource, Semester, Subject } from '../types'

export default function SavedResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [types, setTypes] = useState<ResourceTypeOption[]>([])
  const [branchId, setBranchId] = useState('')
  const [semester, setSemester] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await getSavedResources({ page, pageSize: 12, branchId: branchId || undefined, semester: semester ? Number(semester) : undefined, subjectId: subjectId || undefined, resourceType: resourceType || undefined })
      setResources(result.resources)
      setCount(result.count)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load saved resources.')
    } finally {
      setLoading(false)
    }
  }, [branchId, page, resourceType, semester, subjectId])

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

  const resetPage = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => { setLoading(true); setError(''); setter(event.target.value); setPage(1) }

  return (
    <PageContainer className="resources-page-shell"><div className="resources-page-inner">
      <header className="resources-library-header"><div><p className="eyebrow">Your collection</p><h1>Saved Resources</h1><p>Keep useful study materials close at hand.</p></div><Link to="/resources" className="resource-action-button">Browse resources</Link></header>
      <div className="saved-resource-filters">
        <label><span>Branch</span><select value={branchId} onChange={resetPage(setBranchId)}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label><span>Semester</span><select value={semester} onChange={resetPage(setSemester)}><option value="">All semesters</option>{semesters.map((item) => <option key={item.number} value={item.number}>{item.label}</option>)}</select></label>
        <label><span>Subject</span><select value={subjectId} onChange={resetPage(setSubjectId)}><option value="">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subject_name}</option>)}</select></label>
        <label><span>Type</span><select value={resourceType} onChange={resetPage(setResourceType)}><option value="">All types</option>{types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select></label>
      </div>
      {error ? <div className="resource-empty-state" role="alert">{error}</div> : <ResourceGrid resources={resources} loading={loading} emptyMessage="Save resources here for quick access." onBookmarkChange={() => { setLoading(true); void load() }} />}
      {count > 12 && <nav className="resource-pagination" aria-label="Saved resource pages"><button type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(page - 1) }}>Previous</button><span>Page {page} of {Math.ceil(count / 12)}</span><button type="button" disabled={page >= Math.ceil(count / 12) || loading} onClick={() => { setLoading(true); setPage(page + 1) }}>Next</button></nav>}
    </div></PageContainer>
  )
}
