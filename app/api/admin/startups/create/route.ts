import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type CreateStartupPayload = {
  name: string
  industry: string
  stage: string
  description: string
  tags: string[]
  slug: string
  semesterId: string | null
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

    const payload = (await req.json()) as CreateStartupPayload
    const name = (payload.name ?? '').trim()
    const slug = (payload.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const industry = (payload.industry ?? '').trim()
    const stage = (payload.stage ?? '').trim()
    const description = (payload.description ?? '').trim()
    const tags = Array.isArray(payload.tags) ? payload.tags : []
    const semesterId = payload.semesterId ?? null

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required.' }, { status: 400 })
    }
    if (!semesterId) {
      return NextResponse.json({ error: 'No active semester. Create a semester first.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: insertErr } = await adminClient.from('startups').insert({
      name,
      slug,
      industry: industry || null,
      stage: stage || null,
      description: description || null,
      preferred_tags: tags,
      semester_id: semesterId,
      is_active: true,
      founders: [],
    })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, slug })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
