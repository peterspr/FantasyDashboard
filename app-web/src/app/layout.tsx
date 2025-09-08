import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { QueryProvider } from '@/lib/query-provider'
import { AuthProvider } from '@/lib/auth-context'
import { Navigation } from '@/components/Navigation'

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
        <Script src="https://accounts.google.com/gsi/client" />
        <QueryProvider>
          <AuthProvider>
            <Navigation />
            <main>
              {children}
            </main>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}