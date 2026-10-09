import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { toggleInternshipBookmark } from '../../services/internshipService'

type BookmarkInternshipButtonProps = { internshipId: string; initialSaved?: boolean; onChanged?: (saved: boolean) => void }

export default function BookmarkInternshipButton({ internshipId, initialSaved = false, onChanged }: BookmarkInternshipButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleClick = async () => {
    if (!user) { navigate('/login'); return }
    setBusy(true)
    setError('')
    try {
      const result = await toggleInternshipBookmark(internshipId)
      setSaved(result)
      onChanged?.(result)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update saved opportunities.')
    } finally { setBusy(false) }
  }

  return <button type="button" className="career-icon-button" aria-label={saved ? 'Remove saved internship' : 'Save internship'} title={error || (saved ? 'Remove saved internship' : 'Save internship')} disabled={busy} onClick={() => void handleClick()}>{saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}{error && <span className="sr-only" role="alert">{error}</span>}</button>
}
