import type { Semester, Subject } from '../../types'
import SubjectCard from './SubjectCard'
import SemesterCard from './SemesterCard'

type ResourceQuickFiltersProps = { subjects: Subject[]; semesters: Semester[]; subjectCounts: Record<string, number>; onSemester: (semester: number) => void; onSubject: (subject: Subject) => void }

export default function ResourceQuickFilters({ subjects, semesters, subjectCounts, onSemester, onSubject }: ResourceQuickFiltersProps) {
  return (
    <section className="resource-quick-section" aria-label="Browse resources by subject or semester">
      <div className="resource-quick-heading"><h2>Browse by subject</h2><span>Configurable academic catalog</span></div>
      {subjects.length ? <div className="subject-quick-row">{subjects.slice(0, 12).map((subject) => <SubjectCard key={subject.id} subject={subject} count={subjectCounts[subject.id] ?? 0} onClick={() => onSubject(subject)} />)}</div> : <p className="resource-filter-note">Subjects will appear here once configured by an administrator.</p>}
      <h2>Browse by semester</h2>
      <div className="semester-quick-row">{semesters.map((semester) => <SemesterCard key={semester.number} semester={semester} onClick={() => onSemester(semester.number)} />)}</div>
    </section>
  )
}
