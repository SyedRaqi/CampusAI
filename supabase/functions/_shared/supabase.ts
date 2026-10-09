import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.117.2'

export type AuthContext = { client: SupabaseClient; user: User }

export async function requireUser(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in to use CampusConnect AI.')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!supabaseUrl || !supabaseKey) throw new Error('AI service is not configured.')

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Your session is invalid. Sign in again.')
  return { client, user: data.user }
}

export async function requireAdmin(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc('is_current_user_admin')
  if (error) return false
  return data === true
}
