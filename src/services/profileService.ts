import type { Profile, UserRole } from '../types'
import { supabase } from '../lib/supabase'

export async function getProfileByUserId(authUserId: string): Promise<Profile | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) {
    console.error('Profile load error:', error)
    throw new Error('Unable to load your profile. Please try again.')
  }

  return data as Profile | null
}

export async function getRoleFromProfile(profile: Profile | null): Promise<UserRole | null> {
  if (!profile) {
    return null
  }

  return profile.role
}
