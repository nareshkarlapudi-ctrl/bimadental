'use client'

import Sidebar from './Sidebar'
import type { User } from '@/types'

interface AppLayoutProps {
  children: React.ReactNode
  user: User | null
}

export default function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />
      {/* Main content — offset by sidebar width on desktop, top bar on mobile */}
      <main className="lg:ml-56 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
