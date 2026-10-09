import { ExternalLink } from 'lucide-react'
import type { Company } from '../../types'
import CompanyLogo from './CompanyLogo'

type CompanyCardProps = { company: Company; onEdit?: () => void; onToggleActive?: () => void }

export default function CompanyCard({ company, onEdit, onToggleActive }: CompanyCardProps) {
  return <article className="career-company-card"><CompanyLogo name={company.name} logoUrl={company.logo_url} size="large" /><div><h3>{company.name}{company.is_demo && <span className="career-demo-label">DEMO</span>}</h3><p>{company.industry || 'Industry not specified'} · {company.location || 'Location not specified'}</p>{company.description && <p>{company.description}</p>}{company.website_url && <a href={company.website_url} target="_blank" rel="noreferrer">Official website <ExternalLink size={14} /></a>}</div>{(onEdit || onToggleActive) && <div>{onEdit && <button type="button" className="career-secondary-button" onClick={onEdit}>Edit</button>}{onToggleActive && <button type="button" className="career-secondary-button" onClick={onToggleActive}>{company.is_active ? 'Archive' : 'Restore'}</button>}</div>}</article>
}
