'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Target, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { LoginButton } from './auth/LoginButton'
import { useAuth } from '../lib/auth-context'

const navigationItems = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
    public: true,
  },
  {
    label: 'Projections',
    href: '/projections',
    icon: Target,
    public: true,
  },
  {
    label: 'ROS',
    href: '/ros',
    icon: TrendingUp,
    public: true,
  },
  {
    label: 'My Teams',
    href: '/teams',
    icon: Users,
    authRequired: true,
  },
  {
    label: 'Operations',
    href: '/ops',
    icon: BarChart3,
    public: true,
  },
]

export function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FI</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Fantasy Insights</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems
              .filter((item) => item.public || (item.authRequired && isAuthenticated))
              .map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </div>

          {/* Auth Section */}
          <div className="flex items-center">
            <LoginButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t py-3">
          <div className="flex flex-wrap gap-2">
            {navigationItems
              .filter((item) => item.public || (item.authRequired && isAuthenticated))
              .map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
          </div>
        </div>
      </div>
    </nav>
  )
}
