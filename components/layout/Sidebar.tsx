'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Package,
  Wrench,
  Clock,
  Star,
  BarChart2,
  Menu,
  X,
  Stethoscope,
  LogOut,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/expenses', label: 'Expenses', icon: Wallet },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/equipment', label: 'Equipment', icon: Wrench },
  { href: '/attendance', label: 'Attendance', icon: Clock },
  { href: '/feedback', label: 'Feedback', icon: Star },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
]

const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME || 'ClinicOS'

interface SidebarProps {
  user: User | null
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-white text-teal-700'
          : 'text-teal-50 hover:bg-teal-700/60'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-teal-700">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-base truncate">{clinicName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            active={pathname === link.href || pathname.startsWith(link.href + '/')}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* User + Sign Out */}
      <div className="px-3 pb-4 pt-2 border-t border-teal-700">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              {getInitials(user.name || user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">
                {user.name || user.email}
              </p>
              <p className="text-teal-200 text-xs capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-teal-100 hover:bg-teal-700/60 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-teal-600 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-teal-600 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-base">{clinicName}</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-teal-700 text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-teal-600 z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-teal-700">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-white" />
                <span className="text-white font-bold">{clinicName}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-teal-700 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              {navLinks.map((link) => (
                <NavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  active={pathname === link.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </nav>
            <div className="px-3 pb-4 pt-2 border-t border-teal-700">
              {user && (
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                    {getInitials(user.name || user.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-teal-200 text-xs capitalize">{user.role}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-teal-100 hover:bg-teal-700/60 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
