import { Download, Eye, Bookmark } from 'lucide-react'
import type { ResourceAnalytics } from '../../services/resourceService'

type ResourceStatsProps = { analytics: ResourceAnalytics }

export default function ResourceStats({ analytics }: ResourceStatsProps) {
  const stats = [
    { label: 'Total resources', value: analytics.total_resources, icon: <Bookmark size={18} /> },
    { label: 'Published', value: analytics.published_resources, icon: <Bookmark size={18} /> },
    { label: 'Pending review', value: analytics.pending_resources, icon: <Bookmark size={18} /> },
    { label: 'Downloads', value: analytics.total_downloads, icon: <Download size={18} /> },
    { label: 'Views', value: analytics.total_views, icon: <Eye size={18} /> },
  ]
  return <div className="resource-stats-grid">{stats.map((stat) => <div className="resource-stat" key={stat.label}>{stat.icon}<span>{stat.label}</span><strong>{stat.value.toLocaleString()}</strong></div>)}</div>
}
