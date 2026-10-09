import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { NotificationItem } from '../types'

export interface NotificationRecord extends NotificationItem {
  action_url: string | null
  read_at: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

function safeInternalPath(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes(':')) return null
  return path
}

export function getNotificationPath(notification: NotificationRecord) {
  return safeInternalPath(notification.action_url)
    ?? (notification.related_event_id ? `/events/${notification.related_event_id}` : null)
}

export async function getNotifications(
  page = 0,
  pageSize = 20,
  filters: { category?: string; unread?: boolean } = {},
): Promise<NotificationRecord[]> {
  let query = client()
    .from('notifications')
    .select('id,user_id,title,message,type,related_event_id,is_read,created_at,action_url,read_at,expires_at,metadata')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1)
  const typeGroups: Record<string, string[]> = {
    academic: ['academic_update', 'class_reminder'],
    events: ['event_registration', 'event_reminder', 'event_cancelled', 'event_updated', 'ticket_issued'],
    resources: ['resource_published'],
    internships: ['internship_deadline', 'application_updated', 'interview_reminder', 'internship_published'],
    career: ['internship_deadline', 'application_updated', 'interview_reminder', 'internship_published'],
    clubs: ['club_join_approval', 'club_invitation', 'club_activity'],
    project_teams: ['project_team_invitation', 'team_task'],
    chat: ['message', 'mention', 'message_reaction', 'message_reply'],
    support: ['support_update', 'lost_found_update', 'feedback_response'],
    attendance: ['attendance_warning'],
    announcements: ['announcement'],
  }
  if (filters.category && typeGroups[filters.category]) query = query.in('type', typeGroups[filters.category])
  if (filters.unread !== undefined) query = query.eq('is_read', !filters.unread ? true : false)
  const { data, error } = await query
  if (error) throw new Error('Unable to load notifications.')
  return (data ?? []) as NotificationRecord[]
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await client()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  if (error) throw new Error('Unable to load unread notification count.')
  return count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to update notifications.')
  const { error } = await client().from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userData.user.id)
  if (error) throw new Error('Unable to mark notification as read.')
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to update notifications.')
  const { error } = await client().from('notifications').update({ is_read: true }).eq('user_id', userData.user.id).eq('is_read', false)
  if (error) throw new Error('Unable to mark notifications as read.')
}

export async function dismissNotification(id: string): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to update notifications.')
  const { error } = await client().from('notifications').delete().eq('id', id).eq('user_id', userData.user.id)
  if (error) throw new Error('Unable to dismiss notification.')
}

export function subscribeToNotifications(userId: string, onChange: () => void, onStatus?: (status: string) => void) {
  return client()
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, onChange)
    .subscribe((status) => onStatus?.(status))
}

export async function removeNotificationSubscription(channel: RealtimeChannel) {
  const status = await client().removeChannel(channel)
  if (status !== 'ok') throw new Error('Unable to close notification updates.')
}
