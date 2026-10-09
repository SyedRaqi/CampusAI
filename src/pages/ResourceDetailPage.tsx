import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import BookmarkButton from '../components/resources/BookmarkButton'
import DownloadButton from '../components/resources/DownloadButton'
import ResourceMetadata from '../components/resources/ResourceMetadata'
import ResourcePreview from '../components/resources/ResourcePreview'
import ResourceReportDialog from '../components/resources/ResourceReportDialog'
import { useAuth } from '../contexts/AuthContext'
import { getResource } from '../services/resourceService'
import type { Resource } from '../types'

export default function ResourceDetailPage() {
  const { resourceId = '' } = useParams()
  const { role } = useAuth()
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getResource(resourceId)
      .then((result) => { if (active) setResource(result) })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load this resource.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [resourceId])

  if (loading) return <PageContainer className="page-shell"><div className="resource-preview-loading"><span /></div></PageContainer>
  if (error || !resource) return <PageContainer className="page-shell"><div className="resource-empty-state" role="alert">{error || 'Resource not found or you do not have access.'}<Link to="/resources">Browse resources</Link></div></PageContainer>

  return (
    <PageContainer className="resources-page-shell">
      <motion.main className="resource-detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Link to="/resources" className="resource-back-link"><ArrowLeft size={17} /> Academic Resources</Link>
        <header className="resource-detail-header"><div><p className="eyebrow">{resource.subject?.subject_name ?? 'Academic resource'}{resource.subject?.is_demo ? ' · Demo' : ''}</p><h1>{resource.title}</h1><p>{resource.description || 'Shared academic material.'}</p></div><div className="resource-detail-actions">{resource.status === 'published' && <><BookmarkButton resourceId={resource.id} initialSaved={resource.is_bookmarked} /><DownloadButton resourceId={resource.id} label="Download file" /></>}</div></header>
        <div className="resource-detail-stats"><span>{resource.view_count.toLocaleString()} views</span><span>{resource.download_count.toLocaleString()} downloads</span><span>{resource.save_count.toLocaleString()} saves</span></div>
        <div className="resource-detail-layout"><section className="resource-preview-panel"><div className="resource-section-heading"><h2>Preview</h2><Link to={`/ai?resource=${encodeURIComponent(resource.id)}`} className="resource-ai-button"><Sparkles size={16} /> Ask AI about this resource</Link></div><ResourcePreview resource={resource} /></section><aside className="resource-detail-aside"><section className="resource-info-panel"><h2>Resource details</h2><ResourceMetadata resource={resource} /></section>{role === 'student' && <ResourceReportDialog resourceId={resource.id} />}</aside></div>
      </motion.main>
    </PageContainer>
  )
}
