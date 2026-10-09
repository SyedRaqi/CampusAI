import { Eye, FileStack, Download as DownloadIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Resource } from '../../types'
import BookmarkButton from './BookmarkButton'
import DownloadButton from './DownloadButton'
import FileTypeIcon from './FileTypeIcon'
import { getFileTypeLabel } from '../../utils/resourceFormat'

type ResourceCardProps = { resource: Resource; showStatus?: boolean; onBookmarkChange?: () => void }

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ResourceCard({ resource, showStatus = false, onBookmarkChange }: ResourceCardProps) {
  const subject = resource.subject
  const resourceTypeLabel = resource.resource_type.replaceAll('_', ' ')

  return (
    <article className="resource-card">
      <div className="resource-card-header">
        <span className="resource-file-symbol" role="img" aria-label={getFileTypeLabel(resource.file_type)}><FileTypeIcon mimeType={resource.file_type} size={26} /></span>
        <div className="resource-card-header-actions">
          <BookmarkButton resourceId={resource.id} initialSaved={resource.is_bookmarked} onChanged={onBookmarkChange ? () => onBookmarkChange() : undefined} />
          {showStatus && <span className={`resource-status resource-status-${resource.status}`}>{resource.status.replaceAll('_', ' ')}</span>}
        </div>
      </div>
      <Link className="resource-card-title" to={`/resources/${resource.id}`}><h3>{resource.title}</h3></Link>
      <p className="resource-card-description">{resource.description || 'Academic material shared with the campus community.'}</p>
      <div className="resource-card-tags">
        <span>{subject?.subject_name ?? 'Subject'}</span>
        <span>Semester {resource.semester}</span>
        <span>{resourceTypeLabel}</span>
      </div>
      <p className="resource-card-branch">{subject?.branch?.name ?? 'Configurable branch'}{subject?.is_demo ? ' · Demo subject' : ''}</p>
      <div className="resource-card-meta">
        <span>{resource.uploader_name ?? 'Faculty'}</span>
        <time dateTime={resource.created_at}>{new Date(resource.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
      </div>
      <div className="resource-card-stats">
        <span><Eye size={14} aria-hidden="true" /> {resource.view_count}</span>
        <span><DownloadIcon size={14} aria-hidden="true" /> {resource.download_count}</span>
        <span><FileStack size={14} aria-hidden="true" /> {formatBytes(resource.file_size)}</span>
      </div>
      <div className="resource-card-actions">
        <Link className="resource-action-button resource-action-primary" to={`/resources/${resource.id}`}>Preview</Link>
        {resource.status === 'published' && <DownloadButton resourceId={resource.id} />}
      </div>
    </article>
  )
}
