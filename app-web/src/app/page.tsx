'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/Card'
import { EnvBadge } from '@/components/EnvBadge'
import { checkHealth } from '@/lib/api'

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<string>('checking...')

  useEffect(() => {
    checkHealth()
      .then((status) => setHealthStatus(status))
      .catch(() => setHealthStatus('error'))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Fantasy Insights</h1>
        <p className="text-xl text-gray-600">
          Fantasy Football Insights and Projections Platform
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h2 className="text-xl font-semibold mb-2">API Status</h2>
            <p className="text-gray-600 mb-4">
              Backend API health: <span className="font-mono">{healthStatus}</span>
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
            <h2 className="text-xl font-semibold mb-2">Environment</h2>
            <EnvBadge />
          </Card>
        </div>

        <div className="text-center space-x-4">
          <Link
            href="/about"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Learn More
          </Link>
          <Link
            href="/ops"
            className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Data Ops
          </Link>
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