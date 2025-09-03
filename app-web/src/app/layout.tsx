import type { Metadata } from 'next'
import './globals.css'
import { QueryProvider } from '@/lib/query-provider'

export const metadata: Metadata = {
  title: 'Fantasy Insights',
  description: 'Fantasy Football Insights and Projections',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}