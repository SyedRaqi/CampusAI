import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { toggleBookmark } from '../../services/bookmarkService'

type BookmarkButtonProps = { resourceId: string; initialSaved?: boolean; onChanged?: (saved: boolean) => void }

export default function BookmarkButton({ resourceId, initialSaved = false, onChanged }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleClick = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    setBusy(true)
    setError('')
    try {
      const nextSaved = await toggleBookmark(resourceId)
      setSaved(nextSaved)
      onChanged?.(nextSaved)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update saved resources.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="resource-icon-button" onClick={() => void handleClick()} disabled={busy} aria-label={saved ? 'Remove bookmark' : 'Bookmark resource'} title={error || (saved ? 'Remove bookmark' : 'Save resource')}>
      {saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}
      {error && <span className="sr-only" role="alert">{error}</span>}
    </button>
  )
}
