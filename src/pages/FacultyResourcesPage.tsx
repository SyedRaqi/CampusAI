import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Pencil, Trash2 } from 'lucide-react'
import PageContainer from '../components/PageContainer'
import ResourceTable from '../components/resources/ResourceTable'
import { deleteResource, getFacultyResources } from '../services/resourceService'
import type { Resource, ResourceStatus } from '../types'

const statuses: (ResourceStatus | 'all')[] = ['all', 'published', 'draft', 'pending_review', 'rejected']

export default function FacultyResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [allResources, setAllResources] = useState<Resource[]>([])
  const [status, setStatus] = useState<ResourceStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const all = await getFacultyResources()
      setAllResources(all)
      setResources(status === 'all' ? all : all.filter((resource) => resource.status === status))
      setError('')
    }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load your resources.') }
    finally { setLoading(false) }
  }, [status])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const handleDelete = async (resource: Resource) => {
    if (!window.confirm(`Delete “${resource.title}” and its stored file?`)) return
    try { await deleteResource(resource.id); await load() }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete resource.') }
  }

  const counts = {
    published: allResources.filter((resource) => resource.status === 'published').length,
    draft: allResources.filter((resource) => resource.status === 'draft').length,
    pending: allResources.filter((resource) => resource.status === 'pending_review').length,
    rejected: allResources.filter((resource) => resource.status === 'rejected').length,
  }

  return (
    <PageContainer className="resources-page-shell"><div className="resources-page-inner">
      <header className="resources-library-header"><div><p className="eyebrow">Faculty workspace</p><h1>My Resources</h1><p>Share course material and track its review status.</p></div><Link to="/faculty/resources/upload" className="resource-action-button"><ArrowUpRight size={16} /> Upload Resource</Link></header>
      <div className="resource-status-summary"><div><span>Published</span><strong>{counts.published}</strong></div><div><span>Drafts</span><strong>{counts.draft}</strong></div><div><span>Pending review</span><strong>{counts.pending}</strong></div><div><span>Rejected</span><strong>{counts.rejected}</strong></div></div>
      <div className="resource-filter-pills" aria-label="Filter by resource status">{statuses.map((item) => <button type="button" key={item} className={status === item ? 'active' : ''} onClick={() => { setLoading(true); setStatus(item) }}>{item.replaceAll('_', ' ')}</button>)}</div>
      {error && <p className="resource-inline-error" role="alert">{error}</p>}
      {loading ? <div className="resource-table-skeleton" aria-label="Loading faculty resources" /> : <ResourceTable resources={resources} actions={(resource) => <><Link to={`/faculty/resources/${resource.id}/edit`} aria-label={`Edit ${resource.title}`} title="Edit"><Pencil size={16} /></Link><Link to={`/resources/${resource.id}`} aria-label={`View ${resource.title}`} title="View"><ArrowUpRight size={16} /></Link><button type="button" aria-label={`Delete ${resource.title}`} title="Delete" onClick={() => void handleDelete(resource)}><Trash2 size={16} /></button></>} />}
    </div></PageContainer>
  )
}
