import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type AssignFounderPayload = {
  userId: string
  startupId: string
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

    const { userId, startupId } = (await req.json()) as AssignFounderPayload
    if (!userId || !startupId) {
      return NextResponse.json({ error: 'userId and startupId are required.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Fetch the user's profile
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()
    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Fetch the startup's current founders
    const { data: startup, error: startupErr } = await adminClient
      .from('startups')
      .select('founders')
      .eq('id', startupId)
      .single()
    if (startupErr || !startup) {
      return NextResponse.json({ error: 'Startup not found.' }, { status: 404 })
    }

    const existingFounders: { name: string; email?: string }[] = startup.founders ?? []

    // Avoid duplicate
    if (existingFounders.some(f => f.email === profile.email)) {
      return NextResponse.json({ error: 'User is already a founder of this startup.' }, { status: 400 })
    }

    const updatedFounders = [
      ...existingFounders,
      { name: profile.full_name ?? profile.email, email: profile.email },
    ]

    const { error: updateErr } = await adminClient
      .from('startups')
      .update({ founders: updatedFounders })
      .eq('id', startupId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
