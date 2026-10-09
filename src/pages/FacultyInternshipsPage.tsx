import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import CompanyLogo from '../components/career/CompanyLogo'
import { getFacultyInternships } from '../services/internshipService'
import type { Internship } from '../types'

export default function FacultyInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setInternships(await getFacultyInternships()); setError('') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load submissions.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  return <PageContainer className="career-page-shell"><div className="career-page-inner"><header className="career-hub-header"><div><p className="eyebrow">Faculty workspace</p><h1>Internship Submissions</h1><p>Submit opportunities for administrator review. Faculty cannot publish directly.</p></div><Link to="/faculty/internships/create" className="career-primary-button">Submit Opportunity</Link></header>{error && <p className="career-form-error" role="alert">{error}</p>}{loading ? <div className="career-skeleton" /> : internships.length ? <div className="career-submission-list">{internships.map((internship) => <article key={internship.id} className="career-submission-row"><CompanyLogo name={internship.company?.name ?? 'Company'} logoUrl={internship.company?.logo_url} /><div><strong>{internship.role_title}</strong><span>{internship.company?.name} · {internship.location}</span><small>{internship.status.replaceAll('_', ' ')}{internship.moderation_reason ? ` · ${internship.moderation_reason}` : ''}</small></div><Link to={`/faculty/internships/${internship.id}/edit`} className="career-secondary-button">Edit</Link></article>)}</div> : <div className="career-empty-state">You have not submitted any opportunities.<Link to="/faculty/internships/create" className="career-primary-button">Submit Opportunity</Link></div>}</div></PageContainer>
}
