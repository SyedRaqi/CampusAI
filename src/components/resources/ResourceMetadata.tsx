import type { Resource } from '../../types'
import { getFileTypeLabel } from '../../utils/resourceFormat'

type ResourceMetadataProps = { resource: Resource }

export default function ResourceMetadata({ resource }: ResourceMetadataProps) {
  const entries = [
    ['Subject', `${resource.subject?.subject_name ?? 'Unknown subject'}${resource.subject?.subject_code ? ` · ${resource.subject.subject_code}` : ''}`],
    ['Branch', resource.subject?.branch?.name ?? 'Not configured'],
    ['Semester', `Semester ${resource.semester}`],
    ['Type', resource.resource_type.replaceAll('_', ' ')],
    ['File', `${getFileTypeLabel(resource.file_type)} · ${(resource.file_size / (1024 * 1024)).toFixed(2)} MB`],
    ['Uploaded by', resource.uploader_name ?? 'Faculty'],
    ['Uploaded', new Date(resource.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
  ]

  return <dl className="resource-metadata">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
