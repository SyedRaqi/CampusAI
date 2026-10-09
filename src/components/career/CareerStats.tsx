import { Bookmark, BriefcaseBusiness, CalendarDays, Trophy } from 'lucide-react'
import type { CareerStats as CareerStatsData } from '../../services/applicationService'

type CareerStatsProps = { stats: CareerStatsData }

export default function CareerStats({ stats }: CareerStatsProps) {
  const values = [
    { label: 'Applications', value: stats.applications, icon: <BriefcaseBusiness size={18} /> },
    { label: 'Interviews', value: stats.interviews, icon: <CalendarDays size={18} /> },
    { label: 'Selected', value: stats.selected, icon: <Trophy size={18} /> },
    { label: 'Saved', value: stats.saved, icon: <Bookmark size={18} /> },
  ]
  return <div className="career-stat-grid">{values.map((item) => <div className="career-stat" key={item.label}>{item.icon}<span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
}
