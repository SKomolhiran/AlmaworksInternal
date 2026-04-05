'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function AuthCallbackPage() {
  useEffect(() => {
    const supabase = createClient()

    async function redirectBasedOnProfile(userId: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status, is_active')
        .eq('id', userId)
        .single()

      if (profile?.is_active === false) {
        window.location.href = '/?error=account_inactive'
        return
      }

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

    const params = new URLSearchParams(window.location.search)

    // Supabase redirects here with ?error=... when the link is invalid or expired
    if (params.get('error')) {
      const code = params.get('error_code')
      window.location.href = code === 'otp_expired' ? '/?error=link_expired' : '/?error=no_session'
      return
    }

    const code = params.get('code')

    if (code) {
      // PKCE flow — exchange the one-time code for a session
      supabase.auth.exchangeCodeForSession(code).then(async ({ data: { session }, error }) => {
        if (error || !session) {
          window.location.href = '/?error=link_expired'
          return
        }
        await redirectBasedOnProfile(session.user.id)
      })
      return
    }

    // Implicit flow — tokens arrive in the URL hash (#access_token=...).
    // The browser client processes the hash asynchronously, so getSession()
    // called immediately returns null. onAuthStateChange fires only after
    // processing is complete, making it the reliable way to wait for the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          await redirectBasedOnProfile(session.user.id)
        } else if (event === 'INITIAL_SESSION' && session) {
          // Already signed in (e.g. page refreshed while logged in)
          subscription.unsubscribe()
          await redirectBasedOnProfile(session.user.id)
        }
        // INITIAL_SESSION with null session → still processing hash, wait for SIGNED_IN
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-[#002147] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
