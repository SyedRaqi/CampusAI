/* oxlint-disable react/set-state-in-effect */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import TaskBoard from '../components/community/TaskBoard'
import { getTeam, joinTeam, listTeamMembers } from '../services/projectTeamService'
import { getOrCreateCommunityConversation } from '../services/conversationService'
import type { ProjectTeam, ProjectTeamMember } from '../types'

export default function TeamDetailPage() {
  const { teamId = '' } = useParams()
  const navigate = useNavigate()
  const [team, setTeam] = useState<ProjectTeam | null>(null)
  const [members, setMembers] = useState<ProjectTeamMember[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [teamData, memberRows] = await Promise.all([getTeam(teamId), listTeamMembers(teamId)])
      setTeam(teamData)
      setMembers(memberRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load team.')
    }
  }, [teamId])

  useEffect(() => {
    void load()
  }, [load])

  if (!team) {
    return <PageContainer className="community-page-shell"><div className="community-empty">{error || 'Loading team…'}</div></PageContainer>
  }

  return (
    <PageContainer className="community-page-shell">
      <div className="community-page-inner">
        <Link to="/teams" className="community-back">← Teams</Link>

        <header className="club-detail-hero">
          <div>
            <p className="eyebrow">{team.project_domain}</p>
            <h1>{team.name}</h1>
            <h2>{team.project_title}</h2>
            <p>{team.description}</p>
            <span>{team.member_count ?? 0} members · {team.status}</span>
          </div>

          <div className="community-actions">
            <Link className="community-button secondary" to={`/ai/project?team=${encodeURIComponent(team.id)}`}>Ask AI about this project</Link>
            <button type="button" className="community-button primary" onClick={() => void joinTeam(team.id).then(() => void load())}>Join Team</button>
            <button
              type="button"
              className="community-button secondary"
              onClick={async () => {
                try {
                  const id = await getOrCreateCommunityConversation({ type: 'project_team', name: team.name, project_team_id: team.id })
                  navigate(`/chat?conversation=${id}`)
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to open team chat.')
                }
              }}
            >
              Open Team Chat
            </button>
          </div>
        </header>

        {error && <p className="community-error">{error}</p>}

        <section className="community-panel">
          <div className="community-section-heading">
            <h2>Members</h2>
          </div>
          {members.map((member) => (
            <div className="member-row" key={member.id}>
              <strong>{member.full_name || 'Member'}</strong>
              <span>{member.role} · {member.status}</span>
            </div>
          ))}
        </section>

        <TaskBoard teamId={team.id} canManage={true} />
      </div>
    </PageContainer>
  )
}
