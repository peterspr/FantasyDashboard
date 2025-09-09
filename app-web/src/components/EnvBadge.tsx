'use client'

export function EnvBadge() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const env = apiUrl.includes('localhost') ? 'development' : 'production'

  const badgeColor =
    env === 'development' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'

  return (
    <div>
      <p className="text-gray-600 mb-2">Current environment:</p>
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
        {env}
      </span>
      <p className="text-sm text-gray-500 mt-2">
        API: <span className="font-mono">{apiUrl}</span>
      </p>
    </div>
  )
}
