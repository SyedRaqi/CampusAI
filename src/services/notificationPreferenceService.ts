import { supabase } from '../lib/supabase'

export const notificationCategories = [
  { id: 'academic', label: 'Academic announcements' },
  { id: 'events', label: 'Events and reminders' },
  { id: 'resources', label: 'Academic resources' },
  { id: 'internships', label: 'Internships' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'project_teams', label: 'Project teams' },
  { id: 'chat', label: 'Chat' },
  { id: 'career', label: 'Career updates' },
  { id: 'support', label: 'Support requests' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'announcements', label: 'Campus announcements' },
  { id: 'system', label: 'System notifications' },
] as const

export type NotificationCategory = typeof notificationCategories[number]['id']
export interface NotificationPreference {
  id?: string
  user_id?: string
  category: NotificationCategory
  in_app_enabled: boolean
  email_enabled: boolean
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data, error } = await client()
    .from('notification_preferences')
    .select('id,user_id,category,in_app_enabled,email_enabled')
  if (error) throw new Error('Unable to load notification preferences.')
  const values = (data ?? []) as NotificationPreference[]
  return notificationCategories.map((category) => values.find((item) => item.category === category.id) ?? {
    category: category.id,
    in_app_enabled: true,
    email_enabled: false,
  })
}

export async function saveNotificationPreferences(preferences: NotificationPreference[]): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to change notification preferences.')
  const rows = preferences.map(({ category, in_app_enabled }) => ({
    user_id: userData.user.id,
    category,
    in_app_enabled,
    email_enabled: false,
    updated_at: new Date().toISOString(),
  }))
  const { error } = await client().from('notification_preferences').upsert(rows, { onConflict: 'user_id,category' })
  if (error) throw new Error('Unable to save notification preferences.')
}
