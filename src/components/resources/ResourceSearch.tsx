import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

type ResourceSearchProps = { value: string; onSearch: (value: string) => void }

export default function ResourceSearch({ value, onSearch }: ResourceSearchProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (draft.trim() === value.trim()) return
    const timer = window.setTimeout(() => onSearch(draft.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [draft, onSearch, value])

  return (
    <label className="resource-search">
      <Search size={21} aria-hidden="true" />
      <span className="sr-only">Search academic resources</span>
      <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search notes, subjects, question papers..." />
      {draft && <button type="button" className="resource-search-clear" onClick={() => setDraft('')} aria-label="Clear search">×</button>}
    </label>
  )
}
