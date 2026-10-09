import { useCallback, useEffect, useState } from 'react'
import { Archive, Pencil, Plus, RotateCcw } from 'lucide-react'
import PageContainer from '../components/PageContainer'
import { createBranch, getBranches, getResourceTypes, getSemesters, getSubjects, saveResourceType, saveSubject, setBranchActive, setResourceTypeActive, setSubjectActive, type ResourceTypeOption, type SubjectInput } from '../services/subjectService'
import type { Branch, Semester, Subject } from '../types'

const emptySubject: SubjectInput = { subject_code: '', subject_name: '', branch_id: '', semester: 1, description: '', credits: 3, subject_type: 'theory' }

export default function AdminSubjectsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [types, setTypes] = useState<ResourceTypeOption[]>([])
  const [subjectForm, setSubjectForm] = useState<SubjectInput>(emptySubject)
  const [editingSubject, setEditingSubject] = useState<string | null>(null)
  const [branchName, setBranchName] = useState('')
  const [typeLabel, setTypeLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    try {
      const [branchRows, semesterRows, subjectRows, typeRows] = await Promise.all([
        getBranches(true), getSemesters(), getSubjects({ includeInactive: true }), getResourceTypes(true),
      ])
      setBranches(branchRows)
      setSemesters(semesterRows)
      setSubjects(subjectRows)
      setTypes(typeRows)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the academic catalog.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const submitSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await saveSubject(subjectForm, editingSubject ?? undefined)
      setSubjectForm(emptySubject)
      setEditingSubject(null)
      setSuccess(editingSubject ? 'Subject updated.' : 'Subject added.')
      await load()
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save subject.') }
  }

  const toggleSubject = async (subject: Subject) => {
    try { await setSubjectActive(subject.id, !subject.is_active); await load() }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to update subject.') }
  }

  const submitBranch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try { await createBranch(branchName); setBranchName(''); setSuccess('Branch added.'); await load() }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to add branch.') }
  }

  const submitType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const label = typeLabel.trim()
    const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!code) { setError('Enter a valid category label.'); return }
    try { await saveResourceType({ code, label, is_active: true, sort_order: types.length + 1 }); setTypeLabel(''); setSuccess('Resource category added.'); await load() }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to add category.') }
  }

  const toggleResourceType = async (type: ResourceTypeOption) => {
    try { await setResourceTypeActive(type.code, !type.is_active); await load() }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to update category.') }
  }

  return (
    <PageContainer className="resources-page-shell"><div className="resources-page-inner">
      <header className="resources-library-header"><div><p className="eyebrow">Administration</p><h1>Subjects & Catalog</h1><p>Configure the branches, semesters, subjects, and resource categories used by the library.</p></div></header>
      {error && <p className="resource-inline-error" role="alert">{error}</p>}{success && <p className="resource-success" role="status">{success}</p>}
      <div className="resource-catalog-layout">
        <section className="resource-info-panel"><h2>{editingSubject ? 'Edit subject' : 'Add subject'}</h2><form className="resource-form compact" onSubmit={(event) => void submitSubject(event)}>
          <label><span>Subject code</span><input required maxLength={40} value={subjectForm.subject_code} onChange={(event) => setSubjectForm((current) => ({ ...current, subject_code: event.target.value }))} /></label>
          <label><span>Subject name</span><input required maxLength={160} value={subjectForm.subject_name} onChange={(event) => setSubjectForm((current) => ({ ...current, subject_name: event.target.value }))} /></label>
          <label><span>Branch</span><select required value={subjectForm.branch_id} onChange={(event) => setSubjectForm((current) => ({ ...current, branch_id: event.target.value }))}><option value="">Choose branch</option>{branches.filter((branch) => branch.is_active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_demo ? ' · Demo' : ''}</option>)}</select></label>
          <label><span>Semester</span><select required value={subjectForm.semester} onChange={(event) => setSubjectForm((current) => ({ ...current, semester: Number(event.target.value) }))}>{semesters.map((semester) => <option key={semester.number} value={semester.number}>{semester.label}</option>)}</select></label>
          <label><span>Credits</span><input required type="number" min={0} max={30} value={subjectForm.credits} onChange={(event) => setSubjectForm((current) => ({ ...current, credits: Number(event.target.value) }))} /></label>
          <label><span>Subject type</span><select required value={subjectForm.subject_type} onChange={(event) => setSubjectForm((current) => ({ ...current, subject_type: event.target.value as NonNullable<Subject['subject_type']> }))}>{['theory', 'practical', 'elective', 'project', 'seminar', 'other'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label><span>Description</span><textarea rows={3} value={subjectForm.description ?? ''} onChange={(event) => setSubjectForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="resource-form-actions"><button className="resource-action-button resource-action-primary" type="submit"><Plus size={16} /> {editingSubject ? 'Update Subject' : 'Add Subject'}</button>{editingSubject && <button className="resource-secondary-button" type="button" onClick={() => { setEditingSubject(null); setSubjectForm(emptySubject) }}>Cancel</button>}</div>
        </form></section>
        <section className="resource-info-panel"><h2>Configurable branches</h2><form className="resource-inline-create" onSubmit={(event) => void submitBranch(event)}><input required value={branchName} onChange={(event) => setBranchName(event.target.value)} placeholder="New branch name" aria-label="New branch name" /><button type="submit" className="resource-action-button"><Plus size={16} /> Add</button></form><div className="resource-catalog-list">{branches.map((branch) => <div key={branch.id} className="resource-catalog-row"><span><strong>{branch.name}</strong><small>{branch.code}{branch.is_demo ? ' · Demo configuration' : ''}</small></span><button type="button" className="resource-icon-button" aria-label={branch.is_active ? `Archive ${branch.name}` : `Restore ${branch.name}`} onClick={() => void setBranchActive(branch.id, !branch.is_active).then(load).catch((actionError: unknown) => setError(actionError instanceof Error ? actionError.message : 'Unable to update branch.'))}>{branch.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}</button></div>)}</div></section>
      </div>
      <section className="resource-info-panel"><div className="resource-section-heading"><h2>Subjects</h2><span>{loading ? 'Loading…' : `${subjects.length} configured`}</span></div><div className="resource-catalog-list">{subjects.map((subject) => <div key={subject.id} className="resource-catalog-row"><span><strong>{subject.subject_name}</strong><small>{subject.subject_code} · {subject.branch?.name ?? 'Branch'} · Semester {subject.semester} · {subject.credits ?? 3} credits · {subject.subject_type ?? 'theory'}{subject.is_demo ? ' · DEMO' : ''}{!subject.is_active ? ' · Archived' : ''}</small></span><div><button type="button" className="resource-icon-button" aria-label={`Edit ${subject.subject_name}`} onClick={() => { setEditingSubject(subject.id); setSubjectForm({ subject_code: subject.subject_code, subject_name: subject.subject_name, branch_id: subject.branch_id, semester: subject.semester, description: subject.description, credits: subject.credits ?? 3, subject_type: subject.subject_type ?? 'theory' }) }}><Pencil size={16} /></button><button type="button" className="resource-icon-button" aria-label={subject.is_active ? `Archive ${subject.subject_name}` : `Restore ${subject.subject_name}`} onClick={() => void toggleSubject(subject)}>{subject.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}</button></div></div>)}{!subjects.length && <p className="resource-empty-compact">No subjects configured.</p>}</div></section>
      <section className="resource-info-panel"><h2>Resource categories</h2><form className="resource-inline-create" onSubmit={(event) => void submitType(event)}><input required value={typeLabel} onChange={(event) => setTypeLabel(event.target.value)} placeholder="New category label" aria-label="New resource category label" /><button type="submit" className="resource-action-button"><Plus size={16} /> Add category</button></form><div className="resource-catalog-list">{types.map((type) => <div key={type.code} className="resource-catalog-row"><span><strong>{type.label}</strong><small>{type.code}{!type.is_active ? ' · Archived' : ''}</small></span><button type="button" className="resource-icon-button" aria-label={type.is_active ? `Archive ${type.label}` : `Restore ${type.label}`} onClick={() => void toggleResourceType(type)}>{type.is_active ? <Archive size={16} /> : <RotateCcw size={16} />}</button></div>)}</div></section>
    </div></PageContainer>
  )
}
