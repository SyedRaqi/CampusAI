import { Link } from 'react-router-dom'
import type { Resource } from '../../types'
import FileTypeIcon from './FileTypeIcon'

type ResourceTableProps = { resources: Resource[]; actions?: (resource: Resource) => React.ReactNode }

export default function ResourceTable({ resources, actions }: ResourceTableProps) {
  return (
    <div className="resource-table-wrap"><table className="resource-table"><thead><tr><th>Resource</th><th>Subject</th><th>Type</th><th>Uploader</th><th>Status</th><th>Uploaded</th><th>Views</th><th>Downloads</th><th>Actions</th></tr></thead>
      <tbody>{resources.map((resource) => <tr key={resource.id}>
        <td><Link to={`/resources/${resource.id}`} className="resource-table-title"><FileTypeIcon mimeType={resource.file_type} size={19} />{resource.title}</Link></td>
        <td>{resource.subject?.subject_name ?? '—'}</td><td>{resource.resource_type.replaceAll('_', ' ')}</td>
        <td>{resource.uploader_name ?? 'Faculty'}</td><td><span className={`resource-status resource-status-${resource.status}`}>{resource.status.replaceAll('_', ' ')}</span></td>
        <td>{new Date(resource.created_at).toLocaleDateString()}</td><td>{resource.view_count}</td><td>{resource.download_count}</td><td><div className="resource-table-actions">{actions?.(resource) ?? <Link to={`/resources/${resource.id}`}>View</Link>}</div></td>
      </tr>)}</tbody></table>{resources.length === 0 && <p className="resource-empty-state">No resources found.</p>}</div>
  )
}
