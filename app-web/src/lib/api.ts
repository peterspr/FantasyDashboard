const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function checkHealth(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/health`)
    if (response.ok) {
      const data = await response.json()
      return data.status || 'ok'
    }
    return 'error'
  } catch (error) {
    console.error('Health check failed:', error)
    return 'error'
  }
}

export async function getMeta() {
  try {
    const response = await fetch(`${API_URL}/v1/meta`)
    if (response.ok) {
      return await response.json()
    }
    throw new Error('Failed to fetch meta')
  } catch (error) {
    console.error('Meta fetch failed:', error)
    throw error
  }
}
