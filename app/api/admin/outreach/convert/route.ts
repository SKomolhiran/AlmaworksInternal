import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ConvertPayload = {
  outreachId: string
  semesterId: string
  email: string
  fullName: string
  company: string | null
  linkedinUrl: string | null
  expertiseTags: string[]
  notes: string | null
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

    const payload = (await req.json()) as ConvertPayload
    const email = (payload.email ?? '').trim().toLowerCase()
    if (!payload.outreachId || !payload.semesterId || !payload.fullName || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    // Verify caller is an authenticated admin (RLS-respecting check with user token).
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 })
    }

    const { data: profile, error: profileErr } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profileErr || profile?.role !== 'admin') {
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
        data: { full_name: payload.fullName },
      },
    })
    if (linkErr || !linkData.user?.id || !linkData.properties?.action_link) {
      return NextResponse.json({ error: linkErr?.message ?? 'Could not generate magic link.' }, { status: 400 })
    }

    const userId = linkData.user.id

    const upsertProfile = await adminClient.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: payload.fullName,
        role: 'mentor',
        status: 'approved',
        semester_id: payload.semesterId,
      },
      { onConflict: 'id' },
    )
    if (upsertProfile.error) {
      return NextResponse.json({ error: upsertProfile.error.message }, { status: 400 })
    }

    const existingMentor = await adminClient
      .from('mentors')
      .select('id')
      .eq('user_id', userId)
      .eq('semester_id', payload.semesterId)
      .maybeSingle()
    if (existingMentor.error) {
      return NextResponse.json({ error: existingMentor.error.message }, { status: 400 })
    }

    let mentorId = existingMentor.data?.id ?? null
    if (!mentorId) {
      const mentorInsert = await adminClient
        .from('mentors')
        .insert({
          user_id: userId,
          semester_id: payload.semesterId,
          full_name: payload.fullName,
          company: payload.company,
          linkedin_url: payload.linkedinUrl,
          expertise_tags: payload.expertiseTags ?? [],
          bio: payload.notes,
          is_active: true,
        })
        .select('id')
        .single()
      if (mentorInsert.error) {
        return NextResponse.json({ error: mentorInsert.error.message }, { status: 400 })
      }
      mentorId = mentorInsert.data.id
    }

    const outreachUpdate = await adminClient
      .from('outreach')
      .update({
        converted_mentor_id: mentorId,
        status: 'onboarded',
        prospect_email: email,
      })
      .eq('id', payload.outreachId)
    if (outreachUpdate.error) {
      return NextResponse.json({ error: outreachUpdate.error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      mentorId,
      magicLink: linkData.properties.action_link,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}

