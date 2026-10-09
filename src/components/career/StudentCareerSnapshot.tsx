import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CareerStats from './CareerStats'
import { getCareerStats, type CareerStats as CareerStatsData } from '../../services/applicationService'

const emptyStats: CareerStatsData = { applications: 0, interviews: 0, selected: 0, saved: 0 }

export default function StudentCareerSnapshot() {
  const [stats, setStats] = useState(emptyStats)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getCareerStats().then((data) => { if (active) setStats(data) })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load career snapshot.') })
    return () => { active = false }
  }, [])

  return <section className="career-dashboard-snapshot"><div className="career-section-heading"><div><p className="eyebrow">Career</p><h2>Career Snapshot</h2></div><Link to="/career-dashboard" className="career-view-link">Career Dashboard</Link></div>{error && <p className="career-muted" role="alert">{error}</p>}<CareerStats stats={stats} /><div className="dashboard-quick-actions"><Link to="/internships" className="career-primary-button">Career Hub</Link><Link to="/internships/applications" className="career-secondary-button">My Applications</Link><Link to="/career-profile" className="career-secondary-button">Career Profile</Link></div></section>
}
