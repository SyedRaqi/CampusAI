import { supabase } from '../lib/supabase'
import type { Club, ClubActivity, ClubMember, ClubPost } from '../types'

function client() { if (!supabase) throw new Error('Supabase is not configured.'); return supabase }
async function userId() { const { data, error } = await client().auth.getUser(); if (error || !data.user) throw new Error('Sign in to use clubs.'); return data.user.id }

export async function listClubs(filters: { search?: string; category?: string } = {}): Promise<Club[]> {
  let query = client().from('clubs').select('*, club_members(count)').eq('status', 'active').order('created_at', { ascending: false })
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.search) query = query.ilike('name', `%${filters.search.trim()}%`)
  const { data, error } = await query
  if (error) throw new Error('Unable to load clubs.')
  const uid = await userId().catch(() => null)
  const clubs = (data ?? []).map(({ club_members, ...club }) => ({ ...club, member_count: club_members?.[0]?.count ?? 0 })) as Club[]
  if (!uid || !clubs.length) return clubs
  const { data: memberships } = await client().from('club_members').select('club_id,status').eq('user_id', uid).in('club_id', clubs.map((club) => club.id))
  const byClub = new Map((memberships ?? []).map((membership) => [membership.club_id as string, membership.status as ClubMember['status']]))
  return clubs.map((club) => ({ ...club, is_member: byClub.get(club.id) === 'active', membership_status: byClub.get(club.id) ?? null }))
}

export async function getClub(clubId: string): Promise<Club | null> {
  const { data, error } = await client().from('clubs').select('*, club_members(count)').eq('id', clubId).maybeSingle()
  if (error) throw new Error('Unable to load club.')
  if (!data) return null
  const { club_members, ...club } = data
  const result = { ...club, member_count: club_members?.[0]?.count ?? 0 } as Club
  const uid = await userId().catch(() => null)
  if (uid) { const { data: membership } = await client().from('club_members').select('status').eq('club_id', clubId).eq('user_id', uid).maybeSingle(); result.is_member = membership?.status === 'active'; result.membership_status = membership?.status ?? null }
  return result
}

export async function joinClub(clubId: string): Promise<void> { const uid = await userId(); const { error } = await client().from('club_members').insert({ club_id: clubId, user_id: uid, role: 'member', status: 'pending' }); if (error) throw new Error('Unable to submit club membership request.') }
export async function leaveClub(clubId: string): Promise<void> { const uid = await userId(); const { error } = await client().from('club_members').update({ status: 'removed' }).eq('club_id', clubId).eq('user_id', uid); if (error) throw new Error('Unable to leave club.') }
export async function getClubMembers(clubId: string): Promise<ClubMember[]> { const { data, error } = await client().from('club_members').select('*, profiles:profiles(full_name)').eq('club_id', clubId).order('joined_at'); if (error) throw new Error('Unable to load club members.'); return (data ?? []).map((row) => ({ ...row, full_name: row.profiles?.full_name })) as ClubMember[] }
export async function updateClubMember(memberId: string, status: ClubMember['status'], role?: ClubMember['role']): Promise<void> { const { error } = await client().from('club_members').update({ status, ...(role ? { role } : {}) }).eq('id', memberId); if (error) throw new Error('Unable to update club membership.') }
export async function listClubActivities(clubId: string): Promise<ClubActivity[]> { const { data, error } = await client().from('club_activities').select('*').eq('club_id', clubId).order('start_time'); if (error) throw new Error('Unable to load club activities.'); return (data ?? []) as ClubActivity[] }
export async function createClubActivity(input: Omit<ClubActivity, 'id' | 'created_at' | 'created_by'>): Promise<void> { const uid = await userId(); const { error } = await client().from('club_activities').insert({ ...input, created_by: uid }); if (error) throw new Error('Unable to create club activity.') }
export async function listClubPosts(clubId: string): Promise<ClubPost[]> { const { data, error } = await client().from('club_posts').select('*, profiles:profiles(full_name)').eq('club_id', clubId).order('created_at', { ascending: false }); if (error) throw new Error('Unable to load club posts.'); return (data ?? []).map((row) => ({ ...row, author_name: row.profiles?.full_name })) as ClubPost[] }
export async function createClubPost(input: Pick<ClubPost, 'club_id' | 'title' | 'content' | 'image_url'>): Promise<void> { const uid = await userId(); const { error } = await client().from('club_posts').insert({ ...input, author_id: uid }); if (error) throw new Error('Unable to publish club post.') }
