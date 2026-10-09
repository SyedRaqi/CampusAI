import { useEffect, useState } from 'react'

type DeadlineBadgeProps = { deadline: string | null; closed?: boolean }

export default function DeadlineBadge({ deadline, closed = false }: DeadlineBadgeProps) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!deadline) return <span className="career-deadline career-deadline-neutral">No deadline provided</span>
  if (closed) return <span className="career-deadline career-deadline-closed">Applications closed</span>
  const time = new Date(deadline).getTime()
  if (now === null) return <span className="career-deadline career-deadline-neutral">Deadline: {new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
  const remainingDays = Math.ceil((time - now) / 86_400_000)
  if (remainingDays < 0) return <span className="career-deadline career-deadline-closed">Deadline passed</span>
  const formattedDate = new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  return <span className={`career-deadline${remainingDays <= 7 ? ' career-deadline-soon' : ''}`}>{remainingDays <= 7 ? `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left` : `Deadline: ${formattedDate}`}</span>
}
