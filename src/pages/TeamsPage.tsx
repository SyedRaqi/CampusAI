import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageContainer from '../components/PageContainer'
import TeamCard from '../components/community/TeamCard'
import { listTeams } from '../services/projectTeamService'
import type { ProjectTeam } from '../types'
export default function TeamsPage(){const [teams,setTeams]=useState<ProjectTeam[]>([]);useEffect(()=>{listTeams().then(setTeams).catch(()=>setTeams([]))},[]);return <PageContainer className="community-page-shell"><div className="community-page-inner"><header className="community-hero"><div><p className="eyebrow">Project collaboration</p><h1>Build something together</h1><p>Find project teams for hackathons, research, assignments and startup ideas.</p></div><Link to="/teams/create" className="community-button primary">Create Team</Link></header><div className="community-grid">{teams.map(team=><TeamCard key={team.id} team={team}/>)}{!teams.length&&<div className="community-empty">No project teams yet. Create your first project team.</div>}</div></div></PageContainer>}
