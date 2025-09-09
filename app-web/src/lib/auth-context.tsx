'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { apiClient } from './api-client'
import type { UserProfile } from './api-types'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
  refreshUserData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set access token in API client when it changes
  useEffect(() => {
    apiClient.setAccessToken(accessToken)
  }, [accessToken])

  // Initialize authentication state on mount
  useEffect(() => {
    initializeAuth()
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const initializeAuth = async () => {
    try {
      // Try to refresh token on app load (check for existing session)
      const success = await tryRefreshToken()
      if (!success) {
        // No existing session, that's okay
        setUser(null)
        setAccessToken(null)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setUser(null)
      setAccessToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      // Call refresh directly to avoid retry logic
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        return false
      }

      const authResponse = await response.json()

      // Set access token in memory
      setAccessToken(authResponse.access_token)
      setUser(authResponse.user)

      // Schedule next refresh before token expires
      scheduleTokenRefresh(authResponse.expires_in)

      return true
    } catch (error) {
      return false
    }
  }

  const scheduleTokenRefresh = (expiresInSeconds: number) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Schedule refresh 5 minutes before expiry, or halfway through if token expires in less than 10 minutes
    const refreshIn =
      expiresInSeconds > 600
        ? (expiresInSeconds - 300) * 1000 // 5 minutes before expiry
        : (expiresInSeconds / 2) * 1000 // Halfway through for short-lived tokens

    refreshTimeoutRef.current = setTimeout(async () => {
      console.log('Auto-refreshing token...')
      const success = await tryRefreshToken()
      if (!success) {
        // Refresh failed, user needs to log in again
        await logout()
      }
    }, refreshIn)
  }

  const logout = async () => {
    try {
      // Call backend logout to clear refresh token cookie
      await apiClient.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
      // Continue with local logout even if server call fails
    } finally {
      // Clear all local state
      setUser(null)
      setAccessToken(null)

      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }

  const refreshUserData = async () => {
    if (!accessToken) return

    try {
      const userData = await apiClient.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      // If user fetch fails with 401, token is likely expired
      if (error instanceof Error && error.message.includes('401')) {
        const refreshed = await tryRefreshToken()
        if (!refreshed) {
          await logout()
        }
      }
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    logout,
    refreshUserData,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}