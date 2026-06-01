'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Get user profile from public.profiles table
  const getUserProfile = useCallback(async (userId) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

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
      } = await supabase.auth.getSession()

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
      setSession(null)
      return null
    }
  }, [])

  // Get current user
  const getUser = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        // Expected error when no session - don't throw, just return null
        if (userError.message === 'Auth session missing!') {
          setUser(null)
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
      setUser(null)
      return null
    }
  }, [getUserProfile])

  // Login with email and password
  const login = useCallback(async (email, password) => {
    try {
      setError(null)
      setLoading(true)

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw loginError

      console.log('Login successful for:', email)
      const currentUser = data.user
      setUser(currentUser)

      // Fetch profile after login
      if (currentUser) {
        await getUserProfile(currentUser.id)
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
      const { error: logoutError } = await supabase.auth.signOut()

      if (logoutError) throw logoutError

      console.log('Logout successful')
      setUser(null)
      setProfile(null)
      setSession(null)
      
      return { success: true }
    } catch (err) {
      const errorMessage = err.message || 'Logout failed'
      console.error('Logout error:', errorMessage)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [])

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession()

      if (refreshError) {
        // Expected error when no session
        if (refreshError.message === 'Auth session missing!') {
          setSession(null)
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
      return null
    }
  }, [])

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Get current session
        const currentSession = await getSession()
        
        if (currentSession?.user) {
          setUser(currentSession.user)
          await getUserProfile(currentSession.user.id)
        } else {
          // Try to get user separately
          await getUser()
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
        await getUserProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [getSession, getUser, getUserProfile])

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
