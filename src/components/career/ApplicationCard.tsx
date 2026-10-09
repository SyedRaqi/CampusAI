import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ApplicationStatus, InternshipApplication } from '../../types'
import { getApplicationStatusLabel } from '../../services/applicationService'

type ApplicationCardProps = { application: InternshipApplication; onStatusChange?: (status: ApplicationStatus) => void }

export default function ApplicationCard({ application, onStatusChange }: ApplicationCardProps) {
  const internship = application.internship
  return (
    <article className="career-application-card">
      <div><p className="eyebrow">{internship?.company?.name ?? 'Opportunity'}</p><h3>{internship?.role_title ?? 'Internship'}</h3></div>
      <span className="career-status-pill">{getApplicationStatusLabel(application.status)}</span>
      {application.applied_at && <p className="career-application-meta">Applied {new Date(application.applied_at).toLocaleDateString()}</p>}
      {internship?.application_deadline && <p className="career-application-meta">Deadline {new Date(internship.application_deadline).toLocaleDateString()}</p>}
      {application.interview_date && <p className="career-application-meta"><CalendarDays size={14} /> Interview {new Date(application.interview_date).toLocaleString()}</p>}
      <div className="career-application-actions"><Link className="career-view-link" to={`/internships/applications/${application.id}`}>View details</Link>{onStatusChange && <label className="career-status-select"><span className="sr-only">Your tracking status</span><select value={application.status} onChange={(event) => onStatusChange(event.target.value as ApplicationStatus)} aria-label="Change your tracking status">{(['saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected', 'rejected', 'withdrawn'] as ApplicationStatus[]).map((status) => <option key={status} value={status}>{getApplicationStatusLabel(status)}</option>)}</select></label>}</div>
    </article>
  )
}
