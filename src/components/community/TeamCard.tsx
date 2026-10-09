import { Users, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProjectTeam } from '../../types'
export default function TeamCard({ team }: { team: ProjectTeam }) { return <article className="community-card team-card"><div className="community-card-body"><div className="team-status">{team.status.replace('_',' ')}</div><h2>{team.name}</h2><h3>{team.project_title}</h3><p>{team.description}</p><div className="community-meta"><span>{team.project_domain}</span><span><Users size={14} /> {team.member_count ?? 0} members</span></div><Link to={`/teams/${team.id}`} className="community-link">Open team <ArrowUpRight size={15} /></Link></div></article> }
