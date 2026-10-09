import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

type InternshipSearchProps = { value: string; onSearch: (value: string) => void }

export default function InternshipSearch({ value, onSearch }: InternshipSearchProps) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (draft.trim() === value.trim()) return
    const timer = window.setTimeout(() => onSearch(draft.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [draft, onSearch, value])
  return <label className="career-search"><Search size={21} aria-hidden="true" /><span className="sr-only">Search internships</span><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search internships, roles or companies..." /><button type="button" aria-label="Clear search" onClick={() => setDraft('')} hidden={!draft}>×</button></label>
}
