'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthCallbackPage() {
  const supabase = createClient()

  useEffect(() => {
    async function run() {
      const code = new URLSearchParams(window.location.search).get('code')

      if (code) {
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !session) {
          console.error('Auth callback error:', error?.message)
          window.location.href = '/pending'
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/pending'
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single()

      if (profile?.status === 'approved' && profile.role) {
        const dest =
          profile.role === 'admin' ? '/dashboard/admin' :
          profile.role === 'mentor' ? '/dashboard/mentor' :
          '/dashboard/startup'
        window.location.href = dest
      } else {
        window.location.href = '/pending'
      }
    }

    run()
  }, [supabase])

  return (
    <div className="min-h-screen bg-[#002147] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
