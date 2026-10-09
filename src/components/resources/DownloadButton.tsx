import { useState } from 'react'
import { Download } from 'lucide-react'
import { getResourceFileUrl } from '../../services/storageService'

type DownloadButtonProps = { resourceId: string; label?: string }

export default function DownloadButton({ resourceId, label = 'Download' }: DownloadButtonProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setBusy(true)
    setError('')
    try {
      const url = await getResourceFileUrl(resourceId, true)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Download unavailable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="resource-action-wrap">
      <button type="button" className="resource-action-button" onClick={() => void handleDownload()} disabled={busy}>
        <Download size={16} aria-hidden="true" /> {busy ? 'Preparing…' : label}
      </button>
      {error && <span className="resource-inline-error" role="alert">{error}</span>}
    </span>
  )
}
