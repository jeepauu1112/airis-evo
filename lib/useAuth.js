'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)
const AUTH_TIMEOUT_MS = 15000
const SIGN_IN_TIMEOUT_MS = 30000
const PROFILE_TIMEOUT_MS = 5000

function withTimeout(promise, message, timeoutMs = AUTH_TIMEOUT_MS) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const clearAuthState = useCallback(() => {
    setUser(null)
    setProfile(null)
    setSession(null)
  }, [])

  // Get user profile from public.profiles table
  const getUserProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        'Timed out while getting user profile',
        PROFILE_TIMEOUT_MS
      )

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', profileError)
      }

      if (data) {
        console.log('Profile:', data)
        setProfile(data)
        return data
      } else {
        console.warn('No profile found for user:', userId)
        setProfile(null)
        return null
      }
    } catch (err) {
      console.warn('Error fetching profile:', err)
      return null
    }
  }, [])

  // Get current session
  const getSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await withTimeout(
        supabase.auth.getSession(),
        'Timed out while getting auth session'
      )

      if (sessionError) {
        // Expected error when no session - don't throw
        if (sessionError.message === 'Auth session missing!') {
          setSession(null)
          return null
        }
        throw sessionError
      }
      setSession(session)
      return session
    } catch (err) {
      // Only log unexpected errors
      if (err.message !== 'Auth session missing!') {
        console.error('Error getting session:', err)
      }
      clearAuthState()
      return null
    }
  }, [clearAuthState])

  // Get current user
  const getUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await withTimeout(
        supabase.auth.getUser(),
        'Timed out while getting auth user'
      )

      if (userError) {
        // Expected error when no session - don't throw, just return null
        if (userError.message === 'Auth session missing!') {
          clearAuthState()
          return null
        }
        throw userError
      }
      
      console.log('Auth User:', user)
      setUser(user)
      
      if (user) {
        await getUserProfile(user.id)
      }
      
      return user
    } catch (err) {
      // Only log errors that are not the expected "session missing" error
      if (err.message !== 'Auth session missing!') {
        console.error('Error getting user:', err)
      }
      clearAuthState()
      return null
    }
  }, [clearAuthState, getUserProfile])

  // Login with email and password
  const login = useCallback(async (email, password) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: loginError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        'Timed out while signing in',
        SIGN_IN_TIMEOUT_MS
      )

      if (loginError) throw loginError

      console.log('Login successful for:', email)
      const currentUser = data.user
      setSession(data.session)
      setUser(currentUser)

      if (currentUser) {
        getUserProfile(currentUser.id)
      }

      return { success: true, user: currentUser }
    } catch (err) {
      const errorMessage = err.message || 'Login failed'
      console.error('Login error:', errorMessage)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [getUserProfile])

  // Logout
  const logout = useCallback(async () => {
    try {
      setError(null)
      const { error: logoutError } = await withTimeout(
        supabase.auth.signOut({ scope: 'local' }),
        'Timed out while signing out'
      )

      if (logoutError) throw logoutError

      console.log('Logout successful')
      
      return { success: true }
    } catch (err) {
      const errorMessage = err.message || 'Logout failed'
      console.error('Logout error:', errorMessage)
      setError(errorMessage)
      return { success: true, warning: errorMessage }
    } finally {
      clearAuthState()
      setLoading(false)
    }
  }, [clearAuthState])

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error: refreshError,
      } = await withTimeout(
        supabase.auth.refreshSession(),
        'Timed out while refreshing auth session'
      )

      if (refreshError) {
        // Expected error when no session
        if (refreshError.message === 'Auth session missing!') {
          clearAuthState()
          return null
        }
        throw refreshError
      }
      
      setSession(session)
      return session
    } catch (err) {
      // Only log errors that are not the expected "session missing" error
      if (err.message !== 'Auth session missing!') {
        console.error('Error refreshing session:', err)
      }
      clearAuthState()
      return null
    }
  }, [clearAuthState])

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Get current session
        const currentSession = await getSession()
        
        if (currentSession?.user) {
          setUser(currentSession.user)
          getUserProfile(currentSession.user.id)
        } else {
          clearAuthState()
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      setSession(session)
      
      if (session?.user) {
        setUser(session.user)
        getUserProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [clearAuthState, getSession, getUserProfile])

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    login,
    logout,
    getUser,
    getSession,
    refreshSession,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
