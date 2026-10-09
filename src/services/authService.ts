import { supabase } from '../lib/supabase'

function mapUsnToAuthEmail(usn: string): string {
  const normalized = usn.trim().toLowerCase()

  return `${normalized}@aitm.edu.in`
}

export async function signInWithUsn(usn: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.')
  }

  const email = mapUsnToAuthEmail(usn)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(getFriendlyAuthError(error.message))
  }

  return data
}

export async function signUpWithUsn(
  fullName: string,
  usn: string,
  password: string,
) {
  if (!supabase) {
    throw new Error('Supabase environment variables are not configured.')
  }

  const normalizedUsn = usn.trim().toUpperCase()
  const normalizedName = fullName.trim()
  const email = mapUsnToAuthEmail(normalizedUsn)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: normalizedName,
        usn: normalizedUsn,
      },
    },
  })

  if (error) {
    throw new Error(getFriendlyAuthError(error.message))
  }

  if (!data.user) {
    throw new Error('Supabase did not create the account. Please try again.')
  }

  if (!data.session) {
    throw new Error(
      'Account created, but email confirmation is required. Please check your Supabase email authentication settings.',
    )
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    auth_user_id: data.user.id,
    role: 'student',
    full_name: normalizedName,
    usn: normalizedUsn,
  })

  if (profileError) {
    throw new Error(
      `Account created, but profile setup failed: ${profileError.message}`,
    )
  }

  return data
}

export async function signOutSession() {
  if (!supabase) {
    return
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error('Unable to sign out right now.')
  }
}

export function getFriendlyAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  ) {
    return 'Invalid USN or password.'
  }

  if (normalized.includes('user not found')) {
    return 'Account not found.'
  }

  if (
    normalized.includes('email not confirmed') ||
    normalized.includes('not activated')
  ) {
    return 'Your account has not been activated.'
  }

  if (normalized.includes('email rate limit')) {
    return 'Too many signup emails were requested. Please try again later.'
  }

  if (normalized.includes('rate limit')) {
    return 'Too many requests. Please try again later.'
  }

  if (
    normalized.includes('forbidden') ||
    normalized.includes('permission')
  ) {
    return 'You do not have permission to access this portal.'
  }

  return message
}