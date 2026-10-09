import { supabase } from '../lib/supabase'
export type CommunityNotificationType = 'message' | 'mention' | 'club_join_approval' | 'club_invitation' | 'project_team_invitation' | 'club_activity' | 'team_task' | 'message_reaction' | 'message_reply'
export async function createCommunityNotification(userId: string, title: string, message: string, type: CommunityNotificationType, relatedId?: string) { if (!supabase) return; await supabase.from('notifications').insert({ user_id: userId, title, message, type, related_event_id: relatedId ?? null }) }
