'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../lib/auth-context'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUserData } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        
        // Handle OAuth errors from Google
        if (error) {
          console.error('OAuth error from Google:', error)
          setError('Authentication was cancelled or failed.')
          setIsProcessing(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // Verify state parameter for security (CSRF protection)
        const storedState = sessionStorage.getItem('oauth_state')
        if (!state || state !== storedState) {
          console.error('Invalid state parameter')
          setError('Invalid authentication request. Please try again.')
          setIsProcessing(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // Clear stored state
        sessionStorage.removeItem('oauth_state')

        if (!code) {
          console.error('No authorization code received')
          setError('No authorization code received from Google.')
          setIsProcessing(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // Exchange code for tokens via our backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important for refresh token cookie
          body: JSON.stringify({
            code,
            redirect_uri: `${window.location.origin}/auth/callback`
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Authentication failed:', errorData)
          setError(errorData.detail || 'Authentication failed. Please try again.')
          setIsProcessing(false)
          setTimeout(() => router.push('/'), 3000)
          return
        }

        const authData = await response.json()
        console.log('Authentication successful:', { user: authData.user })
        
        setIsProcessing(false)
        setError(null) // Clear any previous errors
        setIsSuccess(true)
        
        // Show success message briefly before redirect
        setTimeout(() => {
          // The backend has set the refresh token cookie and returned the access token
          // We need to trigger a page reload so the auth context picks up the new session
          window.location.href = '/'
        }, 1000) // Small delay to show success state
        
      } catch (error) {
        console.error('Authentication error:', error)
        setError('An unexpected error occurred. Please try again.')
        setIsProcessing(false)
        setTimeout(() => router.push('/'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router, refreshUserData])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 text-red-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 text-green-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Successful!</h2>
          <p className="text-gray-600">Redirecting to home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  )
}