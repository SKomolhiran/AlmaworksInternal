import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables.' }, { status: 500 })
    }

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

    const { email, fromStartupId, toStartupId } = await req.json() as {
      email: string
      fromStartupId: string
      toStartupId: string
    }
    if (!email || !fromStartupId || !toStartupId) {
      return NextResponse.json({ error: 'email, fromStartupId, and toStartupId are required.' }, { status: 400 })
    }
    if (fromStartupId === toStartupId) {
      return NextResponse.json({ error: 'fromStartupId and toStartupId must differ.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Fetch both startups in parallel
    const [fromRes, toRes] = await Promise.all([
      adminClient.from('startups').select('founders').eq('id', fromStartupId).single(),
      adminClient.from('startups').select('founders').eq('id', toStartupId).single(),
    ])
    if (fromRes.error || !fromRes.data) {
      return NextResponse.json({ error: 'Source startup not found.' }, { status: 404 })
    }
    if (toRes.error || !toRes.data) {
      return NextResponse.json({ error: 'Destination startup not found.' }, { status: 404 })
    }

    type FounderEntry = { name: string; email?: string; phone?: string }
    const fromFounders: FounderEntry[] = fromRes.data.founders ?? []
    const toFounders: FounderEntry[] = toRes.data.founders ?? []

    const founderEntry = fromFounders.find(f => f.email === email)
    if (!founderEntry) {
      return NextResponse.json({ error: 'Founder not found in source startup.' }, { status: 404 })
    }
    if (toFounders.some(f => f.email === email)) {
      return NextResponse.json({ error: 'Founder already exists in destination startup.' }, { status: 400 })
    }

    // Remove from source, add to destination
    const [removeRes, addRes] = await Promise.all([
      adminClient.from('startups').update({ founders: fromFounders.filter(f => f.email !== email) }).eq('id', fromStartupId),
      adminClient.from('startups').update({ founders: [...toFounders, founderEntry] }).eq('id', toStartupId),
    ])
    if (removeRes.error) {
      return NextResponse.json({ error: removeRes.error.message }, { status: 400 })
    }
    if (addRes.error) {
      return NextResponse.json({ error: addRes.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
