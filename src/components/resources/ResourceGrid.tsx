import type { Resource } from '../../types'
import ResourceCard from './ResourceCard'

type ResourceGridProps = { resources: Resource[]; loading?: boolean; emptyMessage?: string; showStatus?: boolean; onBookmarkChange?: () => void }

export default function ResourceGrid({ resources, loading = false, emptyMessage = 'No academic resources are available yet.', showStatus = false, onBookmarkChange }: ResourceGridProps) {
  if (loading) return <div className="resource-grid" aria-label="Loading resources">{Array.from({ length: 6 }, (_, index) => <div className="resource-skeleton" key={index}><span /><span /><span /></div>)}</div>
  if (!resources.length) return <div className="resource-empty-state">{emptyMessage}</div>
  return <div className="resource-grid">{resources.map((resource) => <ResourceCard key={resource.id} resource={resource} showStatus={showStatus} onBookmarkChange={onBookmarkChange} />)}</div>
}
