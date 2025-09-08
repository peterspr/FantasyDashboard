'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/Card'

interface ManifestRecord {
  dataset: string
  partition: any
  row_count: number
  applied_at: string
}

interface ManifestResponse {
  datasets: ManifestRecord[]
  total: number
}

export default function OpsPage() {
  const [manifest, setManifest] = useState<ManifestResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchManifest()
  }, [])

  const fetchManifest = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/v1/ops/ingest/manifest/latest`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      setManifest(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const formatPartition = (partition: any) => {
    if (typeof partition === 'object' && partition !== null) {
      return Object.entries(partition)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')
    }
    return String(partition)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Operations</h1>
          <p className="text-gray-600">
            Monitor data ingestion status and freshness
          </p>
        </div>

        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Home
          </Link>
        </div>

        {loading && (
          <Card>
            <p className="text-gray-600">Loading manifest data...</p>
          </Card>
        )}

        {error && (
          <Card>
            <div className="text-red-600">
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p>{error}</p>
              <button
                onClick={fetchManifest}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </Card>
        )}

        {manifest && !loading && (
          <div>
            <div className="mb-4">
              <Card>
                <h2 className="text-xl font-semibold mb-2">Summary</h2>
                <p className="text-gray-600">
                  {manifest.total} datasets with ingested data
                </p>
              </Card>
            </div>

            {manifest.datasets.length > 0 ? (
              <Card>
                <h2 className="text-xl font-semibold mb-4">Dataset Freshness</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 font-medium">Dataset</th>
                        <th className="px-4 py-2 font-medium">Partition</th>
                        <th className="px-4 py-2 font-medium">Rows</th>
                        <th className="px-4 py-2 font-medium">Last Applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manifest.datasets.map((record, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 font-medium">{record.dataset}</td>
                          <td className="px-4 py-2 font-mono text-sm">
                            {formatPartition(record.partition)}
                          </td>
                          <td className="px-4 py-2">{record.row_count.toLocaleString()}</td>
                          <td className="px-4 py-2">{formatDate(record.applied_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-gray-600">No ingested data found</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}