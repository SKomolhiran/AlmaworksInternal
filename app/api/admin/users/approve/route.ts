import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ApprovePayload = {
  userId: string
  role: 'mentor' | 'startup' | 'admin'
  fullName: string
  email: string
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 })
    }

    // Verify caller is an authenticated admin
    const authHeader = req.headers.get('authorization') ?? ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 })
    }

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: authData, error: authErr } = await userClient.auth.getUser()
    if (authErr || !authData.user) {
      return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 })
    }
    const adminCheck = await userClient.from('profiles').select('role').eq('id', authData.user.id).single()
    if (adminCheck.error || adminCheck.data?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }

    const payload = (await req.json()) as ApprovePayload
    const { userId, role, fullName, email } = payload
    if (!userId || !role || !['mentor', 'startup', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'userId and a valid role are required.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Approve the profile
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ status: 'approved', role })
      .eq('id', userId)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 })
    }

    // If approved as mentor, ensure a mentors row exists in the active semester
    if (role === 'mentor') {
      const { data: activeSem } = await adminClient
        .from('semesters')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      if (activeSem?.id) {
        const { data: existingMentor } = await adminClient
          .from('mentors')
          .select('id')
          .eq('user_id', userId)
          .eq('semester_id', activeSem.id)
          .maybeSingle()

        if (!existingMentor) {
          await adminClient.from('mentors').insert({
            user_id: userId,
            semester_id: activeSem.id,
            full_name: fullName || email,
            email,
            is_active: true,
            expertise_tags: [],
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
