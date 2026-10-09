import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { InternshipMatch } from '../../services/internshipMatchingService'
import CompanyLogo from './CompanyLogo'
import SkillBadge from './SkillBadge'

type RecommendationCardProps = { match: InternshipMatch }

export default function RecommendationCard({ match }: RecommendationCardProps) {
  const { internship } = match
  return <article className="career-recommendation-card"><div className="career-card-company"><CompanyLogo name={internship.company?.name ?? 'Company'} logoUrl={internship.company?.logo_url} /><div><strong>{internship.role_title}</strong><span>{internship.company?.name}{internship.is_demo ? ' · DEMO OPPORTUNITY' : ''}</span></div></div><p>{match.matchingSkills.length ? `Matches ${match.matchingSkills.length} of your listed skills` : 'No listed skills match yet'}</p><div className="career-recommendation-match"><strong>Skill match {match.skillMatchPercent}%</strong><span>{match.eligible ? 'Eligibility: Eligible' : 'Eligibility: Check requirements'}</span>{match.branchPreferred !== null && <span>Branch: {match.branchPreferred ? 'Preferred' : 'Different from preference'}</span>}{match.workModePreferred !== null && <span>Work mode: {match.workModePreferred ? 'Preferred' : 'Different from preference'}</span>}{match.locationPreferred !== null && <span>Location: {match.locationPreferred ? 'Preferred' : 'Different from preference'}</span>}{match.typePreferred !== null && <span>Type: {match.typePreferred ? 'Preferred' : 'Different from preference'}</span>}</div><div className="career-skill-list">{match.matchingSkills.slice(0, 3).map((skill) => <SkillBadge key={skill} matched>{skill}</SkillBadge>)}</div><Link to={`/internships/${internship.id}`} className="career-view-link">View opportunity <ArrowUpRight size={15} /></Link></article>
}
