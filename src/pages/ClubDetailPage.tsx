/* oxlint-disable react/set-state-in-effect */

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import {
  createClubPost,
  getClub,
  getClubMembers,
  joinClub,
  leaveClub,
  listClubActivities,
  listClubPosts,
} from '../services/clubService'
import { getOrCreateCommunityConversation } from '../services/conversationService'
import type { Club, ClubActivity, ClubMember, ClubPost } from '../types'

export default function ClubDetailPage() {
  const { clubId = '' } = useParams()
  const navigate = useNavigate()
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [activities, setActivities] = useState<ClubActivity[]>([])
  const [posts, setPosts] = useState<ClubPost[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [clubData, memberRows, activityRows, postRows] = await Promise.all([
        getClub(clubId),
        getClubMembers(clubId),
        listClubActivities(clubId),
        listClubPosts(clubId),
      ])

      setClub(clubData)
      setMembers(memberRows)
      setActivities(activityRows)
      setPosts(postRows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load club.')
    }
  }, [clubId])

  useEffect(() => {
    void load()
  }, [load])

  const handleJoin = async () => {
    try {
      await joinClub(clubId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join club.')
    }
  }

  const handleLeave = async () => {
    try {
      await leaveClub(clubId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to leave club.')
    }
  }

  const handleOpenChat = async () => {
    if (!club) return

    try {
      const id = await getOrCreateCommunityConversation({
        type: 'club',
        name: club.name,
        club_id: club.id,
      })
      navigate(`/chat?conversation=${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to open club chat.')
    }
  }

  const handleSubmitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!club) return

    try {
      await createClubPost({
        club_id: club.id,
        title,
        content,
        image_url: null,
      })
      setTitle('')
      setContent('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to publish post.')
    }
  }

  if (!club) {
    return (
      <PageContainer className="community-page-shell">
        <div className="community-empty">{error || 'Loading club…'}</div>
      </PageContainer>
    )
  }

  const member = club.is_member

  return (
    <PageContainer className="community-page-shell">
      <div className="community-page-inner">
        <Link to="/clubs" className="community-back">← Clubs</Link>

        <header className="club-detail-hero">
          <div>
            <p className="eyebrow">{club.category}</p>
            <h1>{club.name}</h1>
            <p>{club.description}</p>
            <span>
              {club.member_count ?? 0} members · {club.meeting_schedule || 'Schedule not configured'}
            </span>
          </div>

          <div className="community-actions">
            <Link className="community-button secondary" to={`/ai?club=${encodeURIComponent(club.id)}`}>Ask AI about this club</Link>
            {member ? (
              <button type="button" className="community-button secondary" onClick={() => void handleLeave()}>
                Leave Club
              </button>
            ) : (
              <button type="button" className="community-button primary" onClick={() => void handleJoin()}>
                Join Club
              </button>
            )}

            <button type="button" className="community-button secondary" onClick={() => void handleOpenChat()}>
              Open Chat
            </button>
          </div>
        </header>

        {error && <p className="community-error">{error}</p>}

        <div className="club-detail-grid">
          <section className="community-panel">
            <div className="community-section-heading">
              <h2>Activities</h2>
              <span>{activities.length}</span>
            </div>

            {activities.map((activity) => (
              <article className="activity-card" key={activity.id}>
                <strong>{activity.title}</strong>
                <span>
                  {activity.activity_type} · {new Date(activity.start_time).toLocaleString()}
                </span>
                <p>{activity.description}</p>
              </article>
            ))}

            {!activities.length && <p className="community-muted">No upcoming activities yet.</p>}
          </section>

          <section className="community-panel">
            <div className="community-section-heading">
              <h2>Members</h2>
              <span>{members.length}</span>
            </div>

            {members.slice(0, 8).map((item) => (
              <div className="member-row" key={item.id}>
                <strong>{item.full_name || 'Member'}</strong>
                <span>
                  {item.role} · {item.status}
                </span>
              </div>
            ))}
          </section>
        </div>

        <section className="community-panel">
          <div className="community-section-heading">
            <h2>Posts & announcements</h2>
          </div>

          {member && (
            <form className="community-post-form" onSubmit={handleSubmitPost}>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Post title"
              />
              <textarea
                required
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Share an update with the club"
                rows={3}
              />
              <button type="submit" className="community-button primary">
                Publish
              </button>
            </form>
          )}

          {posts.map((post) => (
            <article className="post-card" key={post.id}>
              <strong>{post.title}</strong>
              <span>
                {post.author_name || 'Member'} · {new Date(post.created_at).toLocaleDateString()}
              </span>
              <p>{post.content}</p>
            </article>
          ))}

          {!posts.length && <p className="community-muted">No posts yet.</p>}
        </section>
      </div>
    </PageContainer>
  )
}
