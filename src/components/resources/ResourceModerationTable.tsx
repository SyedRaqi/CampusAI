import { useState } from 'react'
import { Archive, Check, Trash2, X } from 'lucide-react'
import type { Resource, ResourceStatus } from '../../types'
import ResourceTable from './ResourceTable'

type ResourceModerationTableProps = {
  resources: Resource[]
  onModerate: (resourceId: string, status: Extract<ResourceStatus, 'published' | 'rejected' | 'archived'>, reason?: string) => Promise<void>
  onDelete: (resource: Resource) => Promise<void>
}

export default function ResourceModerationTable({ resources, onModerate, onDelete }: ResourceModerationTableProps) {
  const [rejectingId, setRejectingId] = useState('')
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const runAction = async (resource: Resource, action: () => Promise<void>) => {
    setBusyId(resource.id)
    setError('')
    try {
      await action()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to moderate resource.')
    } finally {
      setBusyId('')
    }
  }

  const actions = (resource: Resource) => (
    <div className="resource-moderation-actions">
      {resource.status !== 'published' && <button type="button" title="Approve resource" aria-label={`Approve ${resource.title}`} disabled={busyId === resource.id} onClick={() => void runAction(resource, () => onModerate(resource.id, 'published'))}><Check size={16} /></button>}
      <button type="button" title="Reject resource" aria-label={`Reject ${resource.title}`} disabled={busyId === resource.id} onClick={() => { setRejectingId(resource.id); setReason('') }}><X size={16} /></button>
      <button type="button" title="Archive resource" aria-label={`Archive ${resource.title}`} disabled={busyId === resource.id} onClick={() => void runAction(resource, () => onModerate(resource.id, 'archived'))}><Archive size={16} /></button>
      <button type="button" title="Delete resource" aria-label={`Delete ${resource.title}`} disabled={busyId === resource.id} onClick={() => void runAction(resource, () => onDelete(resource))}><Trash2 size={16} /></button>
      {rejectingId === resource.id && <form className="resource-reject-form" onSubmit={(event) => { event.preventDefault(); void runAction(resource, async () => { await onModerate(resource.id, 'rejected', reason); setRejectingId('') }) }}><label><span>Rejection reason</span><textarea required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></label><button type="submit" disabled={busyId === resource.id}>Confirm rejection</button></form>}
    </div>
  )

  return <div>{error && <p className="resource-inline-error" role="alert">{error}</p>}<ResourceTable resources={resources} actions={actions} /></div>
}
