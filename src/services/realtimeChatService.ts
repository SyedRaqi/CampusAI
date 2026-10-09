import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function subscribeToConversation(conversationId: string, onMessage: (payload: unknown) => void): RealtimeChannel | null {
  if (!supabase) return null
  const channel = supabase.channel(`conversation:${conversationId}`, { config: { private: true } })
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onMessage)
  channel.subscribe()
  return channel
}

export function subscribeToPresence(conversationId: string, userId: string, onSync: (state: Record<string, unknown>) => void, onTyping?: (payload: { userId: string; typing: boolean }) => void): RealtimeChannel | null {
  if (!supabase) return null
  const channel = supabase.channel(`conversation:${conversationId}`, { config: { private: true, presence: { key: userId } } })
  channel.on('presence', { event: 'sync' }, () => onSync(channel.presenceState()))
  if (onTyping) channel.on('broadcast', { event: 'typing' }, ({ payload }) => onTyping(payload as { userId: string; typing: boolean }))
  channel.subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online: true }) })
  return channel
}

export async function broadcastTyping(channel: RealtimeChannel | null, userId: string, typing: boolean) { if (channel) await channel.send({ type: 'broadcast', event: 'typing', payload: { userId, typing } }) }
export async function unsubscribe(channel: RealtimeChannel | null) { if (channel && supabase) await supabase.removeChannel(channel) }
