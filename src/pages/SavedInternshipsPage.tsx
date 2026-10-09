import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import InternshipGrid from '../components/career/InternshipGrid'
import { getSavedInternships } from '../services/applicationService'
import type { Internship } from '../types'

export default function SavedInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setInternships(await getSavedInternships()); setError('') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load saved opportunities.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  return <PageContainer className="career-page-shell"><div className="career-page-inner"><header className="career-hub-header"><div><p className="eyebrow">Your collection</p><h1>Saved Internships</h1><p>Save opportunities to compare them later.</p></div><Link to="/internships" className="career-primary-button">Explore Opportunities</Link></header>{error ? <div className="career-empty-state" role="alert">{error}</div> : <InternshipGrid internships={internships} loading={loading} emptyMessage="No saved internships yet." onSavedChange={() => { setLoading(true); void load() }} />}</div></PageContainer>
}
