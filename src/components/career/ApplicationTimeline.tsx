import type { ApplicationStatus } from '../../types'

const stages: ApplicationStatus[] = ['saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected']

type ApplicationTimelineProps = { status: ApplicationStatus }

export default function ApplicationTimeline({ status }: ApplicationTimelineProps) {
  const terminal = status === 'rejected' || status === 'withdrawn'
  const activeIndex = stages.indexOf(status)
  return <ol className="career-application-timeline" aria-label={`Your tracking status: ${status}`}>
    {stages.map((stage, index) => <li key={stage} className={`${!terminal && index <= activeIndex ? 'complete' : ''}${stage === status ? ' current' : ''}`}><span>{index + 1}</span><strong>{stage}</strong></li>)}
    {terminal && <li className={`terminal ${status}`}><span>!</span><strong>{status}</strong></li>}
  </ol>
}
