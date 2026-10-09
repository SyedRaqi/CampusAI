import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import { getCompanies } from '../services/companyService'
import { getInternship, saveInternship, type InternshipInput } from '../services/internshipService'
import { getBranches } from '../services/subjectService'
import type { Branch, Company, InternshipStatus, InternshipType, WorkMode } from '../types'

const blank: InternshipInput = { company_id: '', role_title: '', description: '', short_description: '', location: '', work_mode: 'remote', internship_type: 'summer', duration: '', duration_months: 3, stipend: null, stipend_currency: 'INR', is_paid: false, skills: [], eligibility: '', branch_id: null, minimum_semester: null, maximum_semester: null, application_url: null, official_source_url: null, application_deadline: null, start_date: null, end_date: null }

export default function InternshipFormPage() {
  const { internshipId } = useParams()
  const { role } = useAuth()
  const editing = Boolean(internshipId)
  const [form, setForm] = useState<InternshipInput>(blank)
  const [companies, setCompanies] = useState<Company[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [skillsText, setSkillsText] = useState('')
  const [existingStatus, setExistingStatus] = useState<InternshipStatus>('pending_review')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getCompanies(), getBranches()]).then(([companyRows, branchRows]) => { if (active) { setCompanies(companyRows); setBranches(branchRows) } })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load form options.') })
    if (!internshipId) return () => { active = false }
    getInternship(internshipId).then((internship) => {
      if (!active) return
      if (!internship) { setError('Opportunity not found or unavailable.'); return }
      setExistingStatus(internship.status)
      setForm({ company_id: internship.company_id, role_title: internship.role_title, description: internship.description, short_description: internship.short_description, location: internship.location, work_mode: internship.work_mode, internship_type: internship.internship_type, duration: internship.duration, duration_months: internship.duration_months, stipend: internship.stipend, stipend_currency: internship.stipend_currency, is_paid: internship.is_paid, skills: internship.skills, eligibility: internship.eligibility ?? '', branch_id: internship.branch_id, minimum_semester: internship.minimum_semester, maximum_semester: internship.maximum_semester, application_url: internship.application_url, official_source_url: internship.official_source_url, application_deadline: internship.application_deadline ? new Date(internship.application_deadline).toISOString().slice(0, 16) : null, start_date: internship.start_date, end_date: internship.end_date })
      setSkillsText(internship.skills.join(', '))
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load opportunity.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [internshipId])

  const setField = <Key extends keyof InternshipInput>(key: Key, value: InternshipInput[Key]) => setForm((current) => ({ ...current, [key]: value }))
  const save = async (status: InternshipStatus) => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saveStatus = editing && role === 'admin' && status === 'pending_review' ? existingStatus : status
      await saveInternship({ ...form, skills: skillsText.split(',').map((skill) => skill.trim()).filter(Boolean), stipend: form.is_paid ? form.stipend : null, application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null }, saveStatus, internshipId)
      setMessage(saveStatus === 'draft' ? 'Draft saved.' : saveStatus === 'pending_review' ? 'Opportunity submitted for administrator review.' : 'Opportunity updated.')
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to submit opportunity.') }
    finally { setSaving(false) }
  }
  if (loading) return <PageContainer className="career-page-shell"><div className="career-skeleton" /></PageContainer>

  return <PageContainer className="career-page-shell"><div className="career-page-inner"><header className="career-hub-header"><div><p className="eyebrow">{role === 'admin' ? 'Administration' : 'Faculty workspace'}</p><h1>{editing ? 'Edit Submission' : 'Submit Opportunity'}</h1><p>Only admin-approved submissions become visible to students.</p></div><Link to={role === 'admin' ? '/admin/internships' : '/faculty/internships'} className="career-back-link">{role === 'admin' ? 'Internship Management' : 'My Submissions'}</Link></header>
    {!companies.length && <p className="career-empty-state">No administrator-managed companies are available. Ask an administrator to add a company before submitting.</p>}
    <form className="career-profile-form" onSubmit={(event) => { event.preventDefault(); void save('pending_review') }}>
      <div className="career-form-grid"><label><span>Company</span><select required value={form.company_id} onChange={(event) => setField('company_id', event.target.value)}><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.is_demo ? ' · DEMO' : ''}</option>)}</select></label><label><span>Role title</span><input required maxLength={160} value={form.role_title} onChange={(event) => setField('role_title', event.target.value)} /></label><label className="career-form-wide"><span>Short description</span><input required maxLength={240} value={form.short_description} onChange={(event) => setField('short_description', event.target.value)} /></label><label className="career-form-wide"><span>Description</span><textarea required rows={6} value={form.description} onChange={(event) => setField('description', event.target.value)} /></label>
        <label><span>Location</span><input required value={form.location} onChange={(event) => setField('location', event.target.value)} /></label><label><span>Work mode</span><select value={form.work_mode} onChange={(event) => setField('work_mode', event.target.value as WorkMode)}><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On-site</option></select></label><label><span>Internship type</span><select value={form.internship_type} onChange={(event) => setField('internship_type', event.target.value as InternshipType)}><option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="summer">Summer</option><option value="winter">Winter</option><option value="academic">Academic</option><option value="research">Research</option></select></label><label><span>Duration</span><input required value={form.duration} onChange={(event) => setField('duration', event.target.value)} placeholder="e.g. 12 weeks" /></label><label><span>Duration in months</span><input required type="number" min="0.25" step="0.25" value={form.duration_months} onChange={(event) => setField('duration_months', Number(event.target.value))} /></label>
        <label><span><input type="checkbox" checked={form.is_paid} onChange={(event) => setField('is_paid', event.target.checked)} /> Paid</span></label>{form.is_paid && <><label><span>Stipend (optional)</span><input type="number" min="0" value={form.stipend ?? ''} onChange={(event) => setField('stipend', event.target.value ? Number(event.target.value) : null)} /></label><label><span>Currency</span><input maxLength={3} value={form.stipend_currency} onChange={(event) => setField('stipend_currency', event.target.value.toUpperCase())} /></label></>}
        <label className="career-form-wide"><span>Skills <small>Comma separated</small></span><input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="Python, SQL, React" /></label><label className="career-form-wide"><span>Eligibility</span><textarea rows={3} value={form.eligibility} onChange={(event) => setField('eligibility', event.target.value)} /></label><label><span>Branch eligibility</span><select value={form.branch_id ?? ''} onChange={(event) => setField('branch_id', event.target.value || null)}><option value="">All configured branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label><span>Minimum semester</span><select value={form.minimum_semester ?? ''} onChange={(event) => setField('minimum_semester', event.target.value ? Number(event.target.value) : null)}><option value="">No minimum</option>{Array.from({ length: 8 }, (_, semesterIndex) => <option key={semesterIndex + 1} value={semesterIndex + 1}>Semester {semesterIndex + 1}</option>)}</select></label><label><span>Maximum semester</span><select value={form.maximum_semester ?? ''} onChange={(event) => setField('maximum_semester', event.target.value ? Number(event.target.value) : null)}><option value="">No maximum</option>{Array.from({ length: 8 }, (_, semesterIndex) => <option key={semesterIndex + 1} value={semesterIndex + 1}>Semester {semesterIndex + 1}</option>)}</select></label>
        <label><span>Official application URL <small>HTTPS only</small></span><input type="url" value={form.application_url ?? ''} onChange={(event) => setField('application_url', event.target.value || null)} placeholder="https://" /></label><label><span>Official source URL <small>HTTPS only</small></span><input type="url" value={form.official_source_url ?? ''} onChange={(event) => setField('official_source_url', event.target.value || null)} placeholder="https://" /></label><label><span>Application deadline</span><input type="datetime-local" value={form.application_deadline ?? ''} onChange={(event) => setField('application_deadline', event.target.value || null)} /></label><label><span>Start date</span><input type="date" value={form.start_date ?? ''} onChange={(event) => setField('start_date', event.target.value || null)} /></label><label><span>End date</span><input type="date" value={form.end_date ?? ''} onChange={(event) => setField('end_date', event.target.value || null)} /></label>
      </div>
      {error && <p className="career-form-error" role="alert">{error}</p>}{message && <p className="career-form-success" role="status">{message}</p>}
      <div className="career-form-actions"><button type="button" className="career-secondary-button" disabled={saving} onClick={() => void save('draft')}>Save Draft</button><button type="submit" className="career-primary-button" disabled={saving || !companies.length}>{saving ? 'Submitting…' : 'Submit for Review'}</button></div>
    </form>
  </div></PageContainer>
}
