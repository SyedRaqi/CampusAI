import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, MapPin, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import BookmarkInternshipButton from '../components/career/BookmarkInternshipButton'
import CompanyLogo from '../components/career/CompanyLogo'
import DeadlineBadge from '../components/career/DeadlineBadge'
import SkillBadge from '../components/career/SkillBadge'
import { useAuth } from '../contexts/AuthContext'
import { getInternship } from '../services/internshipService'
import { markAsApplied } from '../services/applicationService'
import type { Internship } from '../types'

export default function InternshipDetailPage() {
  const { internshipId = '' } = useParams()
  const { role } = useAuth()
  const [internship, setInternship] = useState<Internship | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [redirectOpen, setRedirectOpen] = useState(false)
  const [externalOpened, setExternalOpened] = useState(false)
  const [notes, setNotes] = useState('')
  const [marking, setMarking] = useState(false)
  const [message, setMessage] = useState('')
  const [now, setNow] = useState<number | null>(null)
  const redirectDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let active = true
    getInternship(internshipId).then((row) => { if (active) setInternship(row) })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load opportunity.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [internshipId])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const dialog = redirectDialog.current
    if (!dialog) return
    if (redirectOpen && !dialog.open) dialog.showModal()
    if (!redirectOpen && dialog.open) dialog.close()
  }, [redirectOpen])

  const continueExternal = () => {
    if (!internship?.application_url) return
    window.open(internship.application_url, '_blank', 'noopener,noreferrer')
    setExternalOpened(true)
    setRedirectOpen(false)
  }

  const handleApplied = async () => {
    if (!internship) return
    setMarking(true)
    setMessage('')
    try {
      await markAsApplied(internship.id, notes)
      setMessage('Your tracking status is now Applied. This does not confirm an employer submission.')
      setInternship((current) => current ? { ...current, application_status: 'applied' } : current)
    } catch (applyError) { setMessage(applyError instanceof Error ? applyError.message : 'Unable to update your tracker.') }
    finally { setMarking(false) }
  }

  if (loading) return <PageContainer className="career-page-shell"><div className="career-skeleton" /></PageContainer>
  if (error || !internship) return <PageContainer className="career-page-shell"><div className="career-empty-state" role="alert">{error || 'Internship not found or unavailable.'}<Link to="/internships">Browse opportunities</Link></div></PageContainer>

  const isClosed = internship.status === 'closed' || Boolean(now !== null && internship.application_deadline && new Date(internship.application_deadline).getTime() < now)

  return <PageContainer className="career-page-shell"><motion.main className="career-detail-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
    <Link to="/internships" className="career-back-link"><ArrowLeft size={16} /> Career Hub</Link>
    {internship.is_demo && <div className="career-demo-banner">DEMO OPPORTUNITY · Placeholder record only; not a real opening.</div>}
    <header className="career-detail-header"><div className="career-company-heading"><CompanyLogo name={internship.company?.name ?? 'Company'} logoUrl={internship.company?.logo_url} size="large" /><div><p className="eyebrow">{internship.company?.industry ?? 'Industry not specified'}</p><h1>{internship.role_title}</h1><h2>{internship.company?.name ?? 'Company details unavailable'}</h2></div></div><div className="career-detail-actions">{role === 'student' && <><BookmarkInternshipButton internshipId={internship.id} initialSaved={internship.is_bookmarked} /><Link to={`/ai?internship=${encodeURIComponent(internship.id)}`} className="career-secondary-button"><Sparkles size={15} /> Ask AI about this</Link></>}{internship.company?.website_url && <a className="career-secondary-button" href={internship.company.website_url} target="_blank" rel="noopener noreferrer">Company website <ExternalLink size={15} /></a>}</div></header>
    <div className="career-detail-grid"><section className="career-detail-main"><div className="career-description-panel"><h2>About this opportunity</h2><p>{internship.description}</p></div><div className="career-description-panel"><h2>Skills</h2><div className="career-skill-list">{internship.skills.map((skill) => <SkillBadge key={skill}>{skill}</SkillBadge>)}</div></div><div className="career-description-panel"><h2>Eligibility</h2><p>{internship.eligibility || 'No additional eligibility information provided.'}</p>{(internship.minimum_semester || internship.maximum_semester) && <p>Semester {internship.minimum_semester ?? 1}–{internship.maximum_semester ?? 8}</p>}</div></section>
      <aside className="career-detail-aside"><div className="career-description-panel"><h2>Internship details</h2><dl className="career-meta-list"><div><dt>Location</dt><dd><MapPin size={14} /> {internship.location}</dd></div><div><dt>Work mode</dt><dd>{internship.work_mode.replace('_', '-')}</dd></div><div><dt>Type</dt><dd>{internship.internship_type.replace('_', ' ')}</dd></div><div><dt>Duration</dt><dd>{internship.duration}</dd></div><div><dt>Compensation</dt><dd>{internship.is_paid ? `Paid${internship.stipend ? ` · ${internship.stipend_currency} ${internship.stipend}` : ''}` : 'Unpaid / not specified'}</dd></div><div><dt>Start and end</dt><dd>{internship.start_date ? new Date(internship.start_date).toLocaleDateString() : 'Not specified'} – {internship.end_date ? new Date(internship.end_date).toLocaleDateString() : 'Not specified'}</dd></div><div><dt>Application deadline</dt><dd><DeadlineBadge deadline={internship.application_deadline} closed={isClosed} /></dd></div></dl>
        {role === 'student' && <div className="career-apply-section">{internship.application_url && !isClosed ? <button type="button" className="career-primary-button" onClick={() => setRedirectOpen(true)}>Apply externally <ExternalLink size={15} /></button> : <button type="button" className="career-primary-button" disabled>{isClosed ? 'Applications closed' : 'No verified application link'}</button>}{externalOpened && <div className="career-mark-applied"><p>Returned from the external site?</p><label><span>Private notes (optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Keep notes for yourself" /></label><button type="button" className="career-secondary-button" disabled={marking || internship.application_status === 'applied'} onClick={() => void handleApplied()}>{marking ? 'Saving…' : internship.application_status === 'applied' ? 'Marked as Applied' : 'Mark as Applied'}</button></div>}{message && <p className="career-form-message" role="status">{message}</p>}</div>}
      </div></aside>
    </div>
    <dialog ref={redirectDialog} className="career-redirect-dialog" onClose={() => setRedirectOpen(false)}><p className="eyebrow">External application</p><h2>You're being redirected to the application website.</h2><p>CampusConnect does not submit or verify an application. Mark it as applied only after you complete the external form.</p><div><button type="button" className="career-secondary-button" onClick={() => setRedirectOpen(false)}>Cancel</button><button type="button" className="career-primary-button" onClick={continueExternal}>Continue to Application <ExternalLink size={15} /></button></div></dialog>
  </motion.main></PageContainer>
}
