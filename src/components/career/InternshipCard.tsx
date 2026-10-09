import { useEffect, useState } from 'react'
import { ArrowUpRight, BriefcaseBusiness, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Internship } from '../../types'
import { getApplicationStatusLabel } from '../../services/applicationService'
import BookmarkInternshipButton from './BookmarkInternshipButton'
import CompanyLogo from './CompanyLogo'
import DeadlineBadge from './DeadlineBadge'
import SkillBadge from './SkillBadge'

type InternshipCardProps = { internship: Internship; matchingSkills?: string[]; onSavedChange?: () => void }

export default function InternshipCard({ internship, matchingSkills = [], onSavedChange }: InternshipCardProps) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const deadlineClosed = internship.status === 'closed' || Boolean(now !== null && internship.application_deadline && new Date(internship.application_deadline).getTime() < now)
  return (
    <article className={`career-internship-card${internship.is_demo ? ' is-demo' : ''}`}>
      <div className="career-card-company"><CompanyLogo name={internship.company?.name ?? 'Company'} logoUrl={internship.company?.logo_url} /><div><strong>{internship.company?.name ?? 'Company details unavailable'}</strong>{internship.is_demo && <span className="career-demo-label">DEMO OPPORTUNITY</span>}</div><BookmarkInternshipButton internshipId={internship.id} initialSaved={internship.is_bookmarked} onChanged={onSavedChange} /></div>
      <div className="career-card-title"><h2>{internship.role_title}</h2>{internship.application_status && <span className="career-applied-label">{getApplicationStatusLabel(internship.application_status)}</span>}</div>
      <p className="career-card-description">{internship.short_description}</p>
      <div className="career-internship-meta"><span><MapPin size={14} /> {internship.location}</span><span><BriefcaseBusiness size={14} /> {internship.work_mode.replace('_', '-')}</span><span>{internship.is_paid ? 'Paid' : 'Unpaid'}</span><span>{internship.duration}</span></div>
      <div className="career-skill-list">{internship.skills.slice(0, 4).map((skill) => <SkillBadge key={skill} matched={matchingSkills.includes(skill)}>{skill}</SkillBadge>)}</div>
      <div className="career-card-footer"><DeadlineBadge deadline={internship.application_deadline} closed={deadlineClosed} /><Link className="career-view-link" to={`/internships/${internship.id}`}>{deadlineClosed ? 'Closed' : 'View details'} <ArrowUpRight size={15} /></Link></div>
    </article>
  )
}
