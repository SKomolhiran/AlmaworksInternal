'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Profile = {
  full_name: string | null
  email: string
  role: 'mentor' | 'startup' | 'admin' | null
}

type ViewAs = 'admin' | 'mentor' | 'startup'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [viewAs, setViewAs] = useState<ViewAs>('admin')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, role, is_active')
        .eq('id', user.id)
        .single()
      if ((data as typeof data & { is_active?: boolean })?.is_active === false) {
        await supabase.auth.signOut()
        window.location.href = '/?error=account_inactive'
        return
      }
      setProfile(data)
    })
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const effectiveRole = profile?.role === 'admin' ? viewAs : profile?.role

  const navItems =
    effectiveRole === 'admin'
      ? [
          { href: '/dashboard/admin', label: 'Overview' },
          { href: '/dashboard/admin/outreach', label: 'Outreach' },
          { href: '/dashboard/admin/mentors', label: 'Mentors' },
          { href: '/dashboard/admin/import', label: 'Import' },
          { href: '/dashboard/admin/notify', label: 'Notify' },
        ]
      : effectiveRole === 'mentor'
      ? [
          { href: '/dashboard/mentor', label: 'My Schedule' },
        ]
      : [
          { href: '/dashboard/startup', label: 'Dashboard' },
        ]

  const roleLabel =
    effectiveRole === 'admin' ? 'Admin' :
    effectiveRole === 'mentor' ? 'Mentor' :
    effectiveRole === 'startup' ? 'Startup' : ''

  function handleViewChange(next: ViewAs) {
    setViewAs(next)
    const dest =
      next === 'admin' ? '/dashboard/admin' :
      next === 'mentor' ? '/dashboard/mentor' :
      '/dashboard/startup'
    router.push(dest)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-[#002147] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <Image src="/images/logo.svg" alt="Almaworks" width={120} height={28} className="invert brightness-200" />
          {roleLabel && (
            <span className="inline-block mt-1 text-[10px] font-semibold tracking-widest uppercase text-[#75AADB]/80 bg-[#75AADB]/10 px-2 py-0.5 rounded-full">
              {roleLabel}
            </span>
          )}
        </div>

        {/* Admin view switcher */}
        {profile?.role === 'admin' && (
          <div className="px-3 pt-3 pb-1">
            <p className="px-1 text-[9px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">View as</p>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              {(['admin', 'startup', 'mentor'] as ViewAs[]).map(v => (
                <button
                  key={v}
                  onClick={() => handleViewChange(v)}
                  className={`flex-1 py-1.5 text-[10px] font-semibold capitalize transition-colors ${
                    viewAs === v
                      ? 'bg-white/20 text-white'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/10'
                  }`}
                >
                  {v === 'admin' ? 'Admin' : v === 'startup' ? 'Startup' : 'Mentor'}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User / sign out */}
        <div className="px-3 py-4 border-t border-white/10">
          {profile && (
            <p className="px-3 text-xs text-white/40 truncate mb-2">
              {profile.full_name ?? profile.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
