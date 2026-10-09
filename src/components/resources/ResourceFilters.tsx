import { Filter } from 'lucide-react'
import type { Branch, Semester, Subject } from '../../types'
import type { ResourceFileFilter, ResourceFilters as ResourceFilterValues, ResourceSort } from '../../services/resourceService'
import type { ResourceTypeOption } from '../../services/subjectService'

type ResourceFiltersProps = {
  filters: ResourceFilterValues
  branches: Branch[]
  semesters: Semester[]
  subjects: Subject[]
  types: ResourceTypeOption[]
  onChange: (filters: ResourceFilterValues) => void
}

export default function ResourceFilters({ filters, branches, semesters, subjects, types, onChange }: ResourceFiltersProps) {
  const set = <Key extends keyof ResourceFilterValues>(key: Key, value: ResourceFilterValues[Key]) => onChange({ ...filters, [key]: value, page: 1 })
  const fields = (
    <>
      <label><span>Resource type</span><select value={filters.resourceType ?? ''} onChange={(event) => set('resourceType', event.target.value || undefined)}><option value="">All types</option>{types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select></label>
      <label><span>Branch</span><select value={filters.branchId ?? ''} onChange={(event) => set('branchId', event.target.value || undefined)}><option value="">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_demo ? ' · Demo' : ''}</option>)}</select></label>
      <label><span>Semester</span><select value={filters.semester ?? ''} onChange={(event) => set('semester', event.target.value ? Number(event.target.value) : undefined)}><option value="">All semesters</option>{semesters.map((semester) => <option key={semester.number} value={semester.number}>{semester.label}</option>)}</select></label>
      <label><span>Subject</span><select value={filters.subjectId ?? ''} onChange={(event) => set('subjectId', event.target.value || undefined)}><option value="">All subjects</option>{subjects.filter((subject) => !filters.branchId || subject.branch_id === filters.branchId).filter((subject) => !filters.semester || subject.semester === filters.semester).map((subject) => <option key={subject.id} value={subject.id}>{subject.subject_name} · {subject.subject_code}</option>)}</select></label>
      <label><span>File type</span><select value={filters.fileType ?? ''} onChange={(event) => set('fileType', (event.target.value || undefined) as ResourceFileFilter | undefined)}><option value="">All files</option><option value="pdf">PDF</option><option value="word">DOC / DOCX</option><option value="presentation">PPT / PPTX</option><option value="image">Images</option><option value="other">Spreadsheet / TXT</option></select></label>
      <label><span>Sort by</span><select value={filters.sort ?? 'newest'} onChange={(event) => set('sort', event.target.value as ResourceSort)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="views">Most viewed</option><option value="downloads">Most downloaded</option><option value="az">A–Z</option></select></label>
    </>
  )

  return (
    <>
      <aside className="resource-filter-sidebar" aria-label="Resource filters">
        <div className="resource-filter-heading"><Filter size={17} aria-hidden="true" /><strong>Refine results</strong></div>
        {fields}
        {branches.length === 0 && <p className="resource-filter-note">Branches will appear here once configured by an administrator.</p>}
      </aside>
      <details className="resource-filter-drawer">
        <summary><Filter size={17} aria-hidden="true" /> Filters</summary>
        <div className="resource-filter-drawer-content">{fields}</div>
      </details>
    </>
  )
}
