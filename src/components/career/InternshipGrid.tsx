import type { Internship } from '../../types'
import InternshipCard from './InternshipCard'

type InternshipGridProps = { internships: Internship[]; loading?: boolean; emptyMessage?: string; onSavedChange?: () => void }

export default function InternshipGrid({ internships, loading = false, emptyMessage = 'No opportunities are available right now.', onSavedChange }: InternshipGridProps) {
  if (loading) return <div className="career-internship-grid" aria-label="Loading opportunities">{Array.from({ length: 6 }, (_, skeletonIndex) => <div className="career-skeleton" key={skeletonIndex}><span /><span /><span /></div>)}</div>
  if (!internships.length) return <div className="career-empty-state">{emptyMessage}</div>
  return <div className="career-internship-grid">{internships.map((internship) => <InternshipCard key={internship.id} internship={internship} onSavedChange={onSavedChange} />)}</div>
}
