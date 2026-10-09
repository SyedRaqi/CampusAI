import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import ApplicationTimeline from '../components/career/ApplicationTimeline'
import CompanyLogo from '../components/career/CompanyLogo'
import { getApplicationById, updateApplication } from '../services/applicationService'
import type { ApplicationStatus, InternshipApplication, InterviewType } from '../types'

export default function ApplicationDetailPage() {
  const { applicationId = '' } = useParams()
  const [application, setApplication] = useState<InternshipApplication | null>(null)
  const [status, setStatus] = useState<ApplicationStatus>('saved')
  const [notes, setNotes] = useState('')
  const [interviewDate, setInterviewDate] = useState('')
  const [interviewType, setInterviewType] = useState<InterviewType | ''>('')
  const [interviewNotes, setInterviewNotes] = useState('')
  const [offerDate, setOfferDate] = useState('')
  const [offerStartDate, setOfferStartDate] = useState('')
  const [offerDuration, setOfferDuration] = useState('')
  const [outcome, setOutcome] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    getApplicationById(applicationId).then((result) => {
      if (!active || !result) return
      setApplication(result)
      setStatus(result.status)
      setNotes(result.notes ?? '')
      setInterviewDate(result.interview_date ? new Date(result.interview_date).toISOString().slice(0, 16) : '')
      setInterviewType(result.interview_type ?? '')
      setInterviewNotes(result.interview_notes ?? '')
      setOfferDate(result.offer_date ?? '')
      setOfferStartDate(result.offer_start_date ?? '')
      setOfferDuration(result.offer_duration ?? '')
      setOutcome(result.outcome ?? '')
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load application.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [applicationId])

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateApplication(applicationId, {
        status,
        notes: notes.trim() || null,
        interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
        interview_type: interviewType || null,
        interview_notes: interviewNotes.trim() || null,
        offer_date: offerDate || null,
        offer_start_date: offerStartDate || null,
        offer_duration: offerDuration.trim() || null,
        outcome: outcome.trim() || null,
      })
      setSuccess('Your private tracking details were saved.')
      const refreshed = await getApplicationById(applicationId)
      if (refreshed) setApplication(refreshed)
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save application details.') }
    finally { setSaving(false) }
  }

  if (loading) return <PageContainer className="career-page-shell"><div className="career-skeleton" /></PageContainer>
  if (!application) return <PageContainer className="career-page-shell"><div className="career-empty-state" role="alert">{error || 'Application not found or unavailable.'}<Link to="/internships/applications">Back to applications</Link></div></PageContainer>
  const internship = application.internship

  return <PageContainer className="career-page-shell"><div className="career-page-inner career-application-detail">
    <Link to="/internships/applications" className="career-back-link">← My Applications</Link>
    <header className="career-application-detail-heading"><CompanyLogo name={internship?.company?.name ?? 'Company'} logoUrl={internship?.company?.logo_url} size="large" /><div><p className="eyebrow">Your tracking status · private</p><h1>{internship?.role_title ?? 'Application'}</h1><p>{internship?.company?.name}</p></div><Link to={`/internships/${application.internship_id}`} className="career-secondary-button">View internship</Link></header>
    <section className="career-description-panel"><h2>Application timeline</h2><ApplicationTimeline status={application.status} /></section>
    <form className="career-profile-form" onSubmit={(event) => void save(event)}>
      <h2>Private application notes</h2><p>Only you can read these notes. Tracking status is self-reported, not employer-verified.</p>
      <label><span>Your tracking status</span><select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)}>{(['saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected', 'rejected', 'withdrawn'] as ApplicationStatus[]).map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
      <label><span>Notes</span><textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} placeholder="Recruiter contact, preparation, follow-ups..." /></label>
      {status === 'interview' && <div className="career-form-grid"><label><span>Interview date & time</span><input type="datetime-local" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} /></label><label><span>Interview type</span><select value={interviewType} onChange={(event) => setInterviewType(event.target.value as InterviewType | '')}><option value="">Choose type</option><option value="online">Online</option><option value="phone">Phone</option><option value="in_person">In-person</option><option value="technical">Technical</option><option value="hr">HR</option><option value="other">Other</option></select></label><label className="career-form-wide"><span>Interview notes</span><textarea rows={4} value={interviewNotes} onChange={(event) => setInterviewNotes(event.target.value)} maxLength={3000} /></label></div>}
      {(status === 'offer' || status === 'selected') && <div className="career-form-grid"><label><span>Offer date</span><input type="date" value={offerDate} onChange={(event) => setOfferDate(event.target.value)} /></label><label><span>Start date</span><input type="date" value={offerStartDate} onChange={(event) => setOfferStartDate(event.target.value)} /></label><label><span>Duration</span><input value={offerDuration} onChange={(event) => setOfferDuration(event.target.value)} placeholder="e.g. 12 weeks" /></label><label className="career-form-wide"><span>Outcome / private note</span><textarea rows={3} value={outcome} onChange={(event) => setOutcome(event.target.value)} maxLength={1000} /></label></div>}
      {error && <p className="career-form-error" role="alert">{error}</p>}{success && <p className="career-form-success" role="status">{success}</p>}<button type="submit" className="career-primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save tracking details'}</button>
    </form>
  </div></PageContainer>
}
