import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type CreateMentorPayload = {
  semesterId: string
  email: string
  fullName: string
  company: string | null
  roleTitle: string | null
  linkedinUrl: string | null
  expertiseTags: string[]
  bio: string | null
  isActive: boolean
}

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

    const payload = (await req.json()) as CreateMentorPayload
    const email = (payload.email ?? '').trim().toLowerCase()
    const fullName = (payload.fullName ?? '').trim()
    if (!payload.semesterId || !email || !fullName) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
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

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const redirectTo = `${new URL(req.url).origin}/auth/callback`
    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
        data: { full_name: fullName },
      },
    })
    if (linkErr || !linkData.user?.id || !linkData.properties?.action_link) {
      return NextResponse.json({ error: linkErr?.message ?? 'Could not generate magic link.' }, { status: 400 })
    }

    const userId = linkData.user.id
    const profileRes = await adminClient.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: 'mentor',
        status: 'approved',
        semester_id: payload.semesterId,
      },
      { onConflict: 'id' },
    )
    if (profileRes.error) {
      return NextResponse.json({ error: profileRes.error.message }, { status: 400 })
    }

    const existing = await adminClient
      .from('mentors')
      .select('id')
      .eq('user_id', userId)
      .eq('semester_id', payload.semesterId)
      .maybeSingle()
    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 400 })
    }

    let mentorId = existing.data?.id ?? null
    if (!mentorId) {
      const insertRes = await adminClient
        .from('mentors')
        .insert({
          user_id: userId,
          semester_id: payload.semesterId,
          full_name: fullName,
          company: payload.company,
          role_title: payload.roleTitle,
          linkedin_url: payload.linkedinUrl,
          expertise_tags: payload.expertiseTags ?? [],
          bio: payload.bio,
          is_active: payload.isActive,
        })
        .select('id')
        .single()
      if (insertRes.error) {
        return NextResponse.json({ error: insertRes.error.message }, { status: 400 })
      }
      mentorId = insertRes.data.id
    }

    return NextResponse.json({ ok: true, mentorId, magicLink: linkData.properties.action_link })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}

