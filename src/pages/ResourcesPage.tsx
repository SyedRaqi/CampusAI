import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import ResourceFilters from '../components/resources/ResourceFilters'
import ResourceGrid from '../components/resources/ResourceGrid'
import ResourceQuickFilters from '../components/resources/ResourceQuickFilters'
import ResourceSearch from '../components/resources/ResourceSearch'
import { listResources, getPopularResources, getSubjectResourceCounts, RESOURCE_PAGE_SIZE, type ResourceFilters as ResourceFilterValues } from '../services/resourceService'
import { getBranches, getResourceTypes, getSemesters, getSubjects, type ResourceTypeOption } from '../services/subjectService'
import type { Branch, Resource, Semester, Subject } from '../types'

export default function ResourcesPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<ResourceFilterValues>(() => ({
    sort: 'newest',
    page: 1,
    search: searchParams.get('search') || undefined,
  }))
  const [resources, setResources] = useState<Resource[]>([])
  const [popular, setPopular] = useState<Resource[]>([])
  const [popularFallback, setPopularFallback] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({})
  const [types, setTypes] = useState<ResourceTypeOption[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleSearch = useCallback((search: string) => {
    setLoading(true)
    setError('')
    setFilters((current) => ({ ...current, search, page: 1 }))
  }, [])

  const handleFilters = useCallback((next: ResourceFilterValues) => {
    setLoading(true)
    setError('')
    setFilters(next)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([getBranches(), getSemesters(), getSubjects(), getResourceTypes(), getSubjectResourceCounts()])
      .then(([branchRows, semesterRows, subjectRows, typeRows, countRows]) => {
        if (!active) return
        setBranches(branchRows)
        setSemesters(semesterRows)
        setSubjects(subjectRows)
        setTypes(typeRows)
        setSubjectCounts(countRows)
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load the academic catalog.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([listResources({ ...filters, pageSize: RESOURCE_PAGE_SIZE }), getPopularResources(6)])
      .then(([page, popularData]) => {
        if (!active) return
        setResources(page.resources)
        setCount(page.count)
        setPopular(popularData.resources)
        setPopularFallback(popularData.isFallback)
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load resources.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  const pageCount = Math.max(1, Math.ceil(count / RESOURCE_PAGE_SIZE))

  return (
    <PageContainer className="resources-page-shell">
      <div className="resources-page-inner">
        <header className="resources-library-header">
          <div><p className="eyebrow">CampusConnect · Learning library</p><h1>Academic Resources</h1><p>Everything you need to learn, revise and prepare — in one place.</p></div>
          <div className="resources-header-actions"><Link to="/resources/saved" className="resource-action-button">Saved resources</Link></div>
        </header>

        <ResourceSearch value={filters.search ?? ''} onSearch={handleSearch} />
        <ResourceQuickFilters subjects={subjects} semesters={semesters} subjectCounts={subjectCounts} onSemester={(semester) => handleFilters({ ...filters, semester, subjectId: undefined, page: 1 })} onSubject={(subject) => handleFilters({ ...filters, branchId: subject.branch_id, semester: subject.semester, subjectId: subject.id, page: 1 })} />

        <section className="resources-popular-section">
          <div className="resource-section-heading"><div><p className="eyebrow">{popularFallback ? 'Fresh from the library' : 'Based on the last 7 days'}</p><h2>{popularFallback ? 'Latest Resources' : 'Popular This Week'}</h2></div><span>Actual views and downloads</span></div>
          {error ? <p className="resource-inline-error" role="alert">{error}</p> : <ResourceGrid resources={popular} loading={loading && !resources.length} emptyMessage="No academic resources are available yet." />}
        </section>

        <div className="resource-results-heading"><div><p className="eyebrow">Browse catalog</p><h2>All resources <span>({count})</span></h2></div><Link to="/faculty/resources" className="resource-text-button">Faculty resource manager</Link></div>
        <div className="resource-browser-layout">
          <ResourceFilters filters={filters} branches={branches} semesters={semesters} subjects={subjects} types={types} onChange={handleFilters} />
          <section className="resource-results" aria-label="Academic resources">
            {error ? <div className="resource-empty-state" role="alert">{error}</div> : <ResourceGrid resources={resources} loading={loading} emptyMessage={filters.search ? 'No resources match your search.' : 'No academic resources are available yet.'} />}
            {pageCount > 1 && <nav className="resource-pagination" aria-label="Resource pages"><button type="button" disabled={filters.page === 1 || loading} onClick={() => handleFilters({ ...filters, page: (filters.page ?? 1) - 1 })}>Previous</button><span>Page {filters.page ?? 1} of {pageCount}</span><button type="button" disabled={(filters.page ?? 1) >= pageCount || loading} onClick={() => handleFilters({ ...filters, page: (filters.page ?? 1) + 1 })}>Next</button></nav>}
          </section>
        </div>
      </div>
    </PageContainer>
  )
}
