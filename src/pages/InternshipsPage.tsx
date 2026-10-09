import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import InternshipFilters from '../components/career/InternshipFilters'
import InternshipGrid from '../components/career/InternshipGrid'
import InternshipSearch from '../components/career/InternshipSearch'
import { useAuth } from '../contexts/AuthContext'
import { getBranches } from '../services/subjectService'
import { INTERNSHIP_PAGE_SIZE, listInternships, type InternshipFilters as Filters } from '../services/internshipService'
import { getCareerProfile } from '../services/careerProfileService'
import { rankInternships, type InternshipMatch } from '../services/internshipMatchingService'
import type { Branch, CareerPreferences, Internship, StudentSkill } from '../types'

export default function InternshipsPage() {
  const { role } = useAuth()
  const [filters, setFilters] = useState<Filters>({ sort: 'deadline', page: 1 })
  const [internships, setInternships] = useState<Internship[]>([])
  const [matches, setMatches] = useState<InternshipMatch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profileSkills, setProfileSkills] = useState<StudentSkill[]>([])
  const [preferences, setPreferences] = useState<CareerPreferences | null>(null)

  const handleSearch = useCallback((search: string) => {
    setLoading(true)
    setError('')
    setFilters((current) => ({ ...current, search, page: 1 }))
  }, [])
  const handleFilters = useCallback((next: Filters) => {
    setLoading(true)
    setError('')
    setFilters(next)
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([getBranches(), role === 'student' ? getCareerProfile() : Promise.resolve(null)])
      .then(([branchRows, careerProfile]) => {
        if (!active) return
        setBranches(branchRows)
        if (careerProfile?.skills) setProfileSkills(careerProfile.skills)
        if (careerProfile?.preferences) setPreferences(careerProfile.preferences)
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load career preferences.') })
    return () => { active = false }
  }, [role])

  useEffect(() => {
    let active = true
    Promise.all([listInternships({ ...filters, pageSize: INTERNSHIP_PAGE_SIZE }), listInternships({ sort: 'deadline', pageSize: 60 })])
      .then(([result, all]) => {
        if (!active) return
        setInternships(result.internships)
        setCount(result.count)
        setLocations([...new Set(all.internships.map((internship) => internship.location).filter(Boolean))].sort())
        setMatches(rankInternships(all.internships, profileSkills, preferences).slice(0, 4))
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load opportunities.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, preferences, profileSkills])

  const reload = async () => {
    setLoading(true)
    try {
      const result = await listInternships({ ...filters, pageSize: INTERNSHIP_PAGE_SIZE })
      setInternships(result.internships)
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to refresh saved state.') }
    finally { setLoading(false) }
  }
  const pageCount = Math.max(1, Math.ceil(count / INTERNSHIP_PAGE_SIZE))

  return <PageContainer className="career-page-shell"><div className="career-page-inner">
    <header className="career-hub-header"><div><p className="eyebrow">CampusConnect Career Hub</p><h1>Find Your Next Opportunity</h1><p>Discover internships that match your skills, interests and career goals.</p></div><div className="career-header-actions"><Link to="/career-dashboard" className="career-secondary-button">Career Dashboard</Link><Link to="/career-profile" className="career-primary-button">Career Profile</Link></div></header>
    <InternshipSearch value={filters.search ?? ''} onSearch={handleSearch} />
    {role === 'student' && profileSkills.length > 0 && <section className="career-match-strip"><div><p className="eyebrow">Transparent skill matching</p><h2>Based on your listed skills</h2></div><p>Rule-based comparison only. No AI prediction.</p><div className="career-match-row">{matches.slice(0, 3).map((match) => <Link key={match.internship.id} to={`/internships/${match.internship.id}`} className="career-match-item"><strong>{match.internship.role_title}</strong><span>{match.matchingSkills.length} matching skills · {match.skillMatchPercent}%</span></Link>)}</div></section>}
    <div className="career-results-heading"><div><p className="eyebrow">Verified listings and clearly marked demos</p><h2>Opportunities <span>({count})</span></h2></div><Link to="/internships/saved" className="career-view-link">Saved opportunities</Link></div>
    <div className="career-browser-layout"><InternshipFilters filters={filters} branches={branches} locations={locations} onChange={handleFilters} /><section className="career-results" aria-label="Internship opportunities">{error ? <div role="alert" className="career-empty-state">{error}</div> : <InternshipGrid internships={internships} loading={loading} onSavedChange={() => void reload()} />}{pageCount > 1 && <nav className="career-pagination" aria-label="Opportunity pages"><button type="button" disabled={loading || filters.page === 1} onClick={() => handleFilters({ ...filters, page: (filters.page ?? 1) - 1 })}>Previous</button><span>Page {filters.page ?? 1} of {pageCount}</span><button type="button" disabled={loading || (filters.page ?? 1) >= pageCount} onClick={() => handleFilters({ ...filters, page: (filters.page ?? 1) + 1 })}>Next</button></nav>}</section></div>
  </div></PageContainer>
}
