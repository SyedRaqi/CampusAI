/* oxlint-disable react/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  getFriendlyAuthError,
  signInWithUsn,
  signOutSession,
  signUpWithUsn,
} from '../services/authService'
import { getProfileByUserId } from '../services/profileService'
import type { AuthContextValue, Profile, UserRole } from '../types'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setUser(null)
      setProfile(null)
      setRole(null)
      setLoading(false)
      return
    }

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      const authUser = sessionData.session?.user ?? null

      if (!authUser) {
        setUser(null)
        setProfile(null)
        setRole(null)
        return
      }

      setUser({ id: authUser.id })

      const profileData = await getProfileByUserId(authUser.id)

      setProfile(profileData)
      setRole(profileData?.role ?? null)
    } catch (error) {
      console.error('Auth/profile loading error:', error)

      setProfile(null)
      setRole(null)

      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const { data: sessionData, error } =
          await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (!active) {
          return
        }

        const authUser = sessionData.session?.user ?? null

        if (!authUser) {
          setUser(null)
          setProfile(null)
          setRole(null)
          return
        }

        setUser({ id: authUser.id })

        const fetchedProfile = await getProfileByUserId(authUser.id)

        if (!active) {
          return
        }

        setProfile(fetchedProfile)
        setRole(fetchedProfile?.role ?? null)
      } catch (error) {
        console.error('Initial auth loading error:', error)

        if (active) {
          setUser(null)
          setProfile(null)
          setRole(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void init()

    if (!supabase) {
      return () => {
        active = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setRole(null)
        setLoading(false)

        navigate('/login', { replace: true })
        return
      }

      if (session?.user) {
        setUser({ id: session.user.id })
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [navigate])

  const signIn = useCallback(
    async (usn: string, password: string) => {
      setLoading(true)

      try {
        await signInWithUsn(usn, password)

        // Load the profile only once after successful login.
        await refreshProfile()
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Something went wrong while signing in.'

        throw new Error(getFriendlyAuthError(message))
      } finally {
        setLoading(false)
      }
    },
    [refreshProfile],
  )

  const signUp = useCallback(
    async (fullName: string, usn: string, password: string) => {
      setLoading(true)

      try {
        await signUpWithUsn(fullName, usn, password)
        await refreshProfile()
      } finally {
        setLoading(false)
      }
    },
    [refreshProfile],
  )

  const signOut = useCallback(async () => {
    setLoading(true)

    try {
      await signOutSession()

      setUser(null)
      setProfile(null)
      setRole(null)

      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, profile, role, loading, signIn, signUp, signOut, refreshProfile],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}