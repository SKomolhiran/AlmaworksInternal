'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardRoot() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', user.id)
        .single()
      if (!profile || profile.status !== 'approved') { router.push('/pending'); return }
      if (profile.role === 'admin') router.push('/dashboard/admin')
      else if (profile.role === 'mentor') router.push('/dashboard/mentor')
      else router.push('/dashboard/startup')
    })
  }, [supabase, router])

  return (
    <div className="flex items-center justify-center h-40">
      <div className="w-5 h-5 border-2 border-[#002147] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
