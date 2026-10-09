import { useState } from 'react'
import { Flag } from 'lucide-react'
import { reportResource } from '../../services/resourceService'
import type { ResourceReportReason } from '../../types'

type ResourceReportDialogProps = { resourceId: string }

export default function ResourceReportDialog({ resourceId }: ResourceReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ResourceReportReason>('incorrect_content')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await reportResource(resourceId, reason, description)
      setMessage('Report sent for review.')
      setOpen(false)
      setDescription('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="resource-report-control">
      {!open ? <button type="button" className="resource-text-button" onClick={() => setOpen(true)}><Flag size={16} aria-hidden="true" /> Report resource</button> : (
        <form className="resource-report-form" onSubmit={(event) => void submit(event)}>
          <label><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value as ResourceReportReason)}><option value="incorrect_content">Incorrect content</option><option value="broken_file">Broken file</option><option value="duplicate">Duplicate</option><option value="inappropriate">Inappropriate content</option><option value="other">Other</option></select></label>
          <label><span>Details (optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} /></label>
          <div><button type="button" className="resource-text-button" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="resource-action-button" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button></div>
        </form>
      )}
      {message && <p role="status" className="resource-inline-error">{message}</p>}
    </div>
  )
}
