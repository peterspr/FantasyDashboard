'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/Card'
import { EnvBadge } from '@/components/EnvBadge'
import { useHealth, useMeta } from '@/lib/queries'
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react'

export default function Home() {
  const { data: health } = useHealth()
  const { data: meta } = useMeta()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Handle OAuth callback if parameters are present
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (code && state) {
      // This is an OAuth callback, handle it
      handleOAuthCallback(code, state)
    }
  }, [searchParams])

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const storedState = sessionStorage.getItem('oauth_state')
      
      // Verify state parameter
      if (state !== storedState) {
        console.error('Invalid state parameter')
        router.push('/?error=invalid_state')
        return
      }

      // Clear stored state
      sessionStorage.removeItem('oauth_state')

      // Exchange code for tokens
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/google/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}/`
        }),
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      // Clear URL parameters and reload page to show authenticated state
      router.push('/')
      window.location.reload()
      
    } catch (error) {
      console.error('OAuth callback error:', error)
      router.push('/?error=auth_failed')
    }
  }

  const features = [
    {
      title: 'Weekly Projections',
      description: 'View player projections for any week with customizable scoring',
      href: '/projections',
      icon: Target,
      color: 'bg-blue-500',
    },
    {
      title: 'Rest of Season',
      description: 'See full season projections and rankings',
      href: '/ros',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Player Analysis',
      description: 'Deep dive into player usage trends and statistics',
      href: '/players/00-0030506', // Example player ID
      icon: BarChart3,
      color: 'bg-purple-500',
    },
    {
      title: 'Data Operations',
      description: 'Monitor data pipeline and ingestion status',
      href: '/ops',
      icon: Users,
      color: 'bg-gray-500',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Fantasy Insights</h1>
        <p className="text-xl text-gray-600 mb-8">
          Fantasy Football Insights and Projections Platform
        </p>
        <EnvBadge />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card>
            <h2 className="text-xl font-semibold mb-2">API Status</h2>
            <p className="text-gray-600 mb-4">
              Backend API health:
              <span className="font-mono ml-2 px-2 py-1 bg-gray-100 rounded">
                {health?.status || 'checking...'}
              </span>
            </p>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/health`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              Check API Health →
            </a>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold mb-2">Service Info</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Service: {meta?.service || 'loading...'}</div>
              <div>Version: {meta?.version || 'loading...'}</div>
              <div>Environment: {meta?.env || 'loading...'}</div>
            </div>
          </Card>
        </div>

        {/* Feature Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Explore Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full ${feature.color} text-white mb-4`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Sample Data Table</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-4 py-2">Team</th>
                    <th className="px-4 py-2">Position</th>
                    <th className="px-4 py-2">Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-2">Josh Allen</td>
                    <td className="px-4 py-2">BUF</td>
                    <td className="px-4 py-2">QB</td>
                    <td className="px-4 py-2">24.5</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Christian McCaffrey</td>
                    <td className="px-4 py-2">SF</td>
                    <td className="px-4 py-2">RB</td>
                    <td className="px-4 py-2">18.2</td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-2">Tyreek Hill</td>
                    <td className="px-4 py-2">MIA</td>
                    <td className="px-4 py-2">WR</td>
                    <td className="px-4 py-2">15.8</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
