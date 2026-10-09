import type { Semester } from '../../types'

type SemesterCardProps = { semester: Semester; onClick: () => void }

export default function SemesterCard({ semester, onClick }: SemesterCardProps) {
  return <button type="button" className="semester-quick-card" onClick={onClick}><span>{String(semester.number).padStart(2, '0')}</span><strong>{semester.label}</strong></button>
}
