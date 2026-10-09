import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import { getAdminDashboardData } from '../services/dashboardService'
import { getResourceAnalytics, type ResourceAnalytics } from '../services/resourceService'

export default function AdminDashboardPage() {
  useAuth()
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboardData>> | null>(null)
  const [resourceStats, setResourceStats] = useState<ResourceAnalytics>({ total_resources: 0, published_resources: 0, pending_resources: 0, total_downloads: 0, total_views: 0, most_downloaded_title: null })
  const [resourceError, setResourceError] = useState('')
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    let active = true
    void getAdminDashboardData().then((dashboard) => {
      if (active) setData(dashboard)
    }).catch((error: unknown) => {
      if (active) setDashboardError(error instanceof Error ? error.message : 'Unable to load administrator dashboard.')
    })
    void getResourceAnalytics().then((stats) => {
      if (active) setResourceStats(stats)
    }).catch((error: unknown) => {
      if (active) setResourceError(error instanceof Error ? error.message : 'Unable to load resource analytics.')
    })
    return () => { active = false }
  }, [])

  return (
    <PageContainer className="placeholder-shell">
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: 1.8, opacity: 0.7, margin: 0 }}>Administration</p>
            <h1 style={{ margin: '0.5rem 0 0' }}>Campus command center</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <Link to="/admin/academics" className="primary-link">Academic operations</Link>
            <Link to="/admin/ai" className="primary-link">AI analytics & FAQs</Link>
            <Link to="/profile" className="primary-link">Manage profile</Link>
          </div>
        </div>
        {dashboardError && <p className="resource-inline-error" role="alert">{dashboardError}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {(data?.metrics ?? []).map((metric) => (
            <div key={metric.label} style={{ background: 'rgba(16,24,40,0.62)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '1rem 1.2rem' }}>
              <p style={{ margin: 0, opacity: 0.7 }}>{metric.label}</p>
              <h3 style={{ margin: '0.5rem 0 0', fontSize: '2rem' }}>{metric.label === 'Total Resources' ? resourceStats.total_resources : metric.value}</h3>
            </div>
          ))}
        </div>

        <section className="learning-hub admin-resource-overview"><div className="learning-hub-heading"><div><p className="eyebrow">Academic library</p><h2>Resource Overview</h2></div><Link to="/admin/resources" className="resource-action-button">Manage Resources</Link></div>
          {resourceError && <p className="resource-inline-error" role="alert">{resourceError}</p>}
          <div className="resource-status-summary"><div><span>Total resources</span><strong>{resourceStats.total_resources}</strong></div><div><span>Pending reviews</span><strong>{resourceStats.pending_resources}</strong></div><div><span>Downloads</span><strong>{resourceStats.total_downloads}</strong></div><div><span>Views</span><strong>{resourceStats.total_views}</strong></div></div>
          <Link to="/admin/subjects" className="resource-text-button">Manage subjects, branches & categories</Link>
        </section>

        <section className="learning-hub"><div className="learning-hub-heading"><div><p className="eyebrow">Career platform</p><h2>Internship management</h2></div><Link to="/admin/internships" className="resource-action-button">Review Opportunities</Link></div><p className="career-muted">Moderate faculty submissions, manage companies and review actual application analytics.</p><Link to="/admin/companies" className="resource-view-link">Manage companies</Link></section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <section style={{ background: 'rgba(16,24,40,0.62)', borderRadius: 18, padding: '1rem 1.2rem' }}>
            <h3>Operations overview</h3>
            {(data?.analytics ?? []).map((item) => (
              <div key={item.label} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                <p style={{ margin: 0, opacity: 0.7 }}>{item.label}</p>
                <strong style={{ fontSize: '1.8rem' }}>{item.value}</strong>
              </div>
            ))}
          </section>

          <section style={{ background: 'rgba(16,24,40,0.62)', borderRadius: 18, padding: '1rem 1.2rem' }}>
            <h3>Admin notes</h3>
            <p style={{ opacity: 0.8 }}>Monitor campus engagement, event approvals, resource availability, and institutional announcements from a single control panel.</p>
            <p style={{ opacity: 0.8 }}>Dashboard totals use the authenticated administrator’s database access. No individual student records or private AI conversations are shown here.</p>
          </section>
        </div>
      </div>
    </PageContainer>
  )
}
