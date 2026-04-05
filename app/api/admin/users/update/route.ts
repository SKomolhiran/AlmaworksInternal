import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UpdateUserPayload = {
  userId: string
  fullName: string
  email: string
  role: 'mentor' | 'startup' | 'admin'
}

export async function PATCH(req: Request) {
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

    // Validate payload
    const payload = (await req.json()) as UpdateUserPayload
    const { userId } = payload
    const email = (payload.email ?? '').trim().toLowerCase()
    const fullName = (payload.fullName ?? '').trim()
    const role = payload.role
    if (!userId || !email || !fullName || !['mentor', 'startup', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'userId, email, fullName, and a valid role are required.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Update email in auth.users if it changed
    const { data: existing } = await adminClient.from('profiles').select('email').eq('id', userId).single()
    if (existing && existing.email !== email) {
      const { error: emailErr } = await adminClient.auth.admin.updateUserById(userId, { email })
      if (emailErr) {
        return NextResponse.json({ error: emailErr.message }, { status: 400 })
      }
    }

    // Update profile
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ full_name: fullName, email, role })
      .eq('id', userId)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 })
    }

    if (role === 'mentor') {
      // Promoted to mentor — ensure a mentors row exists in the active semester
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
            full_name: fullName,
            email,
            is_active: true,
            expertise_tags: [],
          })
        } else {
          // Keep name/email in sync and re-activate if they were previously deactivated
          await adminClient
            .from('mentors')
            .update({ full_name: fullName, email, is_active: true })
            .eq('id', existingMentor.id)
        }
      }
    } else {
      // Unassigned from mentor — deactivate any mentor rows for this user so they
      // no longer appear in the scheduling dropdown or active mentor list.
      // We do not delete because sessions.mentor_id is ON DELETE CASCADE and would
      // destroy session history.
      await adminClient
        .from('mentors')
        .update({ is_active: false })
        .eq('user_id', userId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
