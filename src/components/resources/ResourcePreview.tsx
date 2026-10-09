import { useEffect, useState } from 'react'
import DownloadButton from './DownloadButton'
import { getResourceFileUrl } from '../../services/storageService'
import type { Resource } from '../../types'

type ResourcePreviewProps = { resource: Resource }

export default function ResourcePreview({ resource }: ResourcePreviewProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getResourceFileUrl(resource.id)
      .then((signedUrl) => { if (active) setUrl(signedUrl) })
      .catch((previewError: unknown) => { if (active) setError(previewError instanceof Error ? previewError.message : 'Preview unavailable.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [resource.id])

  if (loading) return <div className="resource-preview-loading" aria-label="Loading preview"><span /></div>
  if (!resource.file_type.includes('pdf') || !url || error) {
    return <div className="resource-preview-unavailable"><p>{error || 'Preview unavailable for this file format.'}</p>{resource.status === 'published' && <DownloadButton resourceId={resource.id} />}</div>
  }

  return <iframe className="resource-pdf-frame" src={`${url}#toolbar=1&navpanes=1`} title={`PDF preview: ${resource.title}`} />
}
