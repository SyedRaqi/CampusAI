import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import CareerStats from '../components/career/CareerStats'
import ProfileCompletion from '../components/career/ProfileCompletion'
import RecommendationCard from '../components/career/RecommendationCard'
import ApplicationCard from '../components/career/ApplicationCard'
import InternshipCard from '../components/career/InternshipCard'
import { useAuth } from '../contexts/AuthContext'
import { getCareerProfile } from '../services/careerProfileService'
import { getCareerStats, getMyApplications, type CareerStats as CareerStatsData } from '../services/applicationService'
import { listInternships } from '../services/internshipService'
import { rankInternships, type InternshipMatch } from '../services/internshipMatchingService'
import type { CareerProfile, Internship, InternshipApplication } from '../types'

const emptyStats: CareerStatsData = { applications: 0, interviews: 0, selected: 0, saved: 0 }

export default function CareerDashboardPage() {
  const { profile: student } = useAuth()
  const [careerProfile, setCareerProfile] = useState<CareerProfile | null>(null)
  const [stats, setStats] = useState<CareerStatsData>(emptyStats)
  const [applications, setApplications] = useState<InternshipApplication[]>([])
  const [matches, setMatches] = useState<InternshipMatch[]>([])
  const [deadlines, setDeadlines] = useState<Internship[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([getCareerProfile(), getCareerStats(), getMyApplications(), listInternships({ sort: 'deadline', pageSize: 40 })])
      .then(([careerData, careerStats, applicationRows, opportunities]) => {
        if (!active) return
        setCareerProfile(careerData)
        setStats(careerStats)
        setApplications(applicationRows)
        const ranked = rankInternships(opportunities.internships, careerData.skills ?? [], careerData.preferences ?? null, student?.semester ? Number(student.semester) : null)
        setMatches(ranked.slice(0, 4))
        setDeadlines(opportunities.internships.filter((item) => item.application_deadline && new Date(item.application_deadline).getTime() > Date.now()).slice(0, 4))
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load career dashboard.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [student?.semester])

  if (loading) return <PageContainer className="career-page-shell"><div className="career-skeleton" /></PageContainer>
  return <PageContainer className="career-page-shell"><div className="career-page-inner">
    <header className="career-hub-header"><div><p className="eyebrow">Career journey</p><h1>Your Career Journey</h1><p>{student?.full_name ? `Welcome, ${student.full_name}.` : 'Your internships and applications in one place.'}</p></div><Link to="/internships" className="career-primary-button">Discover opportunities</Link></header>
    {error && <p className="career-form-error" role="alert">{error}</p>}
    <CareerStats stats={stats} />
    {careerProfile && <section className="career-dashboard-profile"><ProfileCompletion profile={careerProfile} /><Link to="/career-profile" className="career-secondary-button">Complete Profile</Link></section>}
    <section className="career-description-panel"><div className="career-section-heading"><div><p className="eyebrow">Rule-based, transparent matching</p><h2>Recommended Opportunities</h2></div><span>Not an AI prediction</span></div>{matches.length ? <div className="career-recommendation-grid">{matches.map((match) => <RecommendationCard key={match.internship.id} match={match} />)}</div> : <div className="career-empty-state">Complete your career profile to improve opportunity matching.<Link to="/career-profile">Complete Career Profile</Link></div>}</section>
    <section className="career-description-panel"><div className="career-section-heading"><h2>Upcoming deadlines</h2><Link to="/internships">Browse internships</Link></div>{deadlines.length ? <div className="career-internship-grid career-deadline-grid">{deadlines.map((internship) => <InternshipCard key={internship.id} internship={internship} />)}</div> : <p className="career-muted">No upcoming deadlines right now.</p>}</section>
    <section className="career-description-panel"><div className="career-section-heading"><h2>Application pipeline</h2><Link to="/internships/applications">Open tracker</Link></div><div className="career-application-list">{applications.slice(0, 4).map((application) => <ApplicationCard key={application.id} application={application} />)}{!applications.length && <p className="career-muted">Your application tracker is empty.</p>}</div></section>
    <section className="career-ai-advisor"><p className="eyebrow">CampusConnect AI</p><h2>Make your next career move</h2><p>Get profile-aware suggestions, explore skill gaps, and turn a target role into practical milestones. Recommendations are guidance, not employment guarantees.</p><div className="career-prompt-list"><Link to="/ai/career">Review my career profile</Link><Link to="/ai/career-roadmap">Build a career roadmap</Link><Link to="/ai/interview">Practice an interview</Link><Link to="/ai/search?query=internships+matching+my+skills">Find matching opportunities</Link></div></section>
  </div></PageContainer>
}
