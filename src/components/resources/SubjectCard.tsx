import { BookOpenText } from 'lucide-react'
import type { Subject } from '../../types'

type SubjectCardProps = { subject: Subject; count?: number; onClick?: () => void }

export default function SubjectCard({ subject, count, onClick }: SubjectCardProps) {
  const content = <><BookOpenText size={20} aria-hidden="true" /><strong>{subject.subject_name}</strong><span>{subject.subject_code}{subject.is_demo ? ' · Demo' : ''}</span>{count !== undefined && <small>{count} resources</small>}</>
  return onClick ? <button type="button" className="subject-quick-card" onClick={onClick}>{content}</button> : <div className="subject-quick-card">{content}</div>
}
