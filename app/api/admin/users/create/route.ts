import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type CreateUserPayload = {
  email: string
  fullName: string
  role: 'mentor' | 'startup' | 'admin'
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

    // Validate payload
    const payload = (await req.json()) as CreateUserPayload
    const email = (payload.email ?? '').trim().toLowerCase()
    const fullName = (payload.fullName ?? '').trim()
    const role = payload.role
    if (!email || !fullName || !['mentor', 'startup', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'email, fullName, and a valid role are required.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Generate magic link — this creates the auth.users record and emails the invite
    const redirectTo = `${new URL(req.url).origin}/auth/callback`
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
        data: { full_name: fullName },
      },
    })
    if (linkErr || !linkData.user?.id) {
      return NextResponse.json({ error: linkErr?.message ?? 'Could not generate magic link.' }, { status: 400 })
    }

    const userId = linkData.user.id

    // Upsert profile — pre-approved with the chosen role so they go straight to their dashboard
    const { error: profileErr } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
        status: 'approved',
        is_active: true,
      },
      { onConflict: 'id' },
    )
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, email, role })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
