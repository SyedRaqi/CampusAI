import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import ResourceUploader from '../components/resources/ResourceUploader'
import { getResource, updateResource, uploadResource, type ResourceInput } from '../services/resourceService'
import { getBranches, getResourceTypes, getSemesters, getSubjects, type ResourceTypeOption } from '../services/subjectService'
import type { Branch, Semester, Subject } from '../types'

const initialForm: ResourceInput = {
  title: '', description: '', resource_type: 'notes', subject_id: '', section: '', visibility: 'students', version: '1.0', replaces_resource_id: null,
}

export default function ResourceUploadPage() {
  const { resourceId } = useParams()
  const editing = Boolean(resourceId)
  const [form, setForm] = useState<ResourceInput>({ ...initialForm })
  const [branches, setBranches] = useState<Branch[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [types, setTypes] = useState<ResourceTypeOption[]>([])
  const [branchId, setBranchId] = useState('')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getBranches(), getSemesters(), getSubjects(), getResourceTypes()])
      .then(([branchRows, semesterRows, subjectRows, typeRows]) => { if (active) { setBranches(branchRows); setSemesters(semesterRows); setSubjects(subjectRows); setTypes(typeRows) } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load the academic catalog.') })
    if (!resourceId) return () => { active = false }

    getResource(resourceId)
      .then((resource) => {
        if (!active) return
        if (!resource) { setError('Resource not found or you do not have access.'); return }
        setForm({
          title: resource.title,
          description: resource.description ?? '',
          resource_type: resource.resource_type,
          subject_id: resource.subject_id,
          section: resource.section ?? '',
          visibility: resource.visibility,
          version: resource.version,
          replaces_resource_id: resource.replaces_resource_id,
        })
        setBranchId(resource.branch_id)
        setSemester(String(resource.semester))
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load resource.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [resourceId])

  const filteredSubjects = useMemo(() => subjects.filter((subject) => (!branchId || subject.branch_id === branchId) && (!semester || subject.semester === Number(semester))), [branchId, semester, subjects])
  const update = <Key extends keyof ResourceInput>(key: Key, value: ResourceInput[Key]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (status: 'draft' | 'pending_review') => {
    setSaving(true)
    setError('')
    setSuccess('')
    setProgress(null)
    try {
      if (editing && resourceId) {
        await updateResource(resourceId, form, status)
        setSuccess(status === 'draft' ? 'Draft saved.' : 'Resource updated and submitted for review.')
      } else {
        if (!file) throw new Error('Choose a file before uploading.')
        await uploadResource(form, file, status, setProgress)
        setSuccess(status === 'draft' ? 'Draft uploaded successfully.' : 'Resource uploaded successfully and submitted for review.')
        setFile(null)
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the resource.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageContainer className="page-shell"><div className="resource-table-skeleton" /></PageContainer>

  return (
    <PageContainer className="resources-page-shell"><div className="resources-page-inner">
      <header className="resources-library-header"><div><p className="eyebrow">Faculty workspace</p><h1>{editing ? 'Edit Resource' : 'Upload Resource'}</h1><p>Uploads are private until authorized access is granted through publication.</p></div><Link to="/faculty/resources" className="resource-text-button">My Resources</Link></header>
      <form className="resource-form" onSubmit={(event) => { event.preventDefault(); void submit('pending_review') }}>
        <label><span>Resource title</span><input required maxLength={180} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Unit 1 revision notes" /></label>
        <label><span>Description <small>Optional, but helpful to students</small></span><textarea rows={4} maxLength={2000} value={form.description} onChange={(event) => update('description', event.target.value)} /></label>
        <div className="resource-form-grid">
          <label><span>Resource type</span><select value={form.resource_type} onChange={(event) => update('resource_type', event.target.value)}>{types.map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}</select></label>
          <label><span>Branch</span><select required value={branchId} onChange={(event) => { setBranchId(event.target.value); update('subject_id', '') }}><option value="">Choose branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}{branch.is_demo ? ' · Demo' : ''}</option>)}</select></label>
          <label><span>Semester</span><select required value={semester} onChange={(event) => { setSemester(event.target.value); update('subject_id', '') }}><option value="">Choose semester</option>{semesters.map((item) => <option key={item.number} value={item.number}>{item.label}</option>)}</select></label>
          <label><span>Subject</span><select required value={form.subject_id} onChange={(event) => update('subject_id', event.target.value)}><option value="">Choose subject</option>{filteredSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subject_name} · {subject.subject_code}{subject.is_demo ? ' · Demo' : ''}</option>)}</select></label>
          <label><span>Section <small>Optional</small></span><input maxLength={20} value={form.section} onChange={(event) => update('section', event.target.value)} /></label>
          <label><span>Visibility</span><select value={form.visibility} onChange={(event) => update('visibility', event.target.value as ResourceInput['visibility'])}><option value="students">Students</option><option value="faculty">Faculty</option><option value="all">Everyone</option></select></label>
        </div>
        {editing ? <div className="resource-current-file">Current file remains attached. Replacing the file is not available in this edit flow.</div> : <ResourceUploader file={file} onFileChange={setFile} onError={setError} progress={progress} disabled={saving} />}
        {error && <p className="resource-inline-error" role="alert">{error}</p>}
        {success && <p className="resource-success" role="status">{success} <Link to="/faculty/resources">View My Resources</Link></p>}
        <div className="resource-form-actions"><button type="button" className="resource-secondary-button" disabled={saving} onClick={() => void submit('draft')}>{saving ? 'Saving…' : 'Save Draft'}</button><button type="submit" className="resource-action-button resource-action-primary" disabled={saving}>{saving ? progress === null ? 'Saving…' : `Uploading ${progress}%` : editing ? 'Submit Changes for Review' : 'Upload & Submit for Review'}</button></div>
      </form>
    </div></PageContainer>
  )
}
