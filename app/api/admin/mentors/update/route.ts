import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UpdateMentorPayload = {
  mentorId: string
  full_name?: string
  company?: string | null
  role_title?: string | null
  linkedin_url?: string | null
  bio?: string | null
  expertise_tags?: string[]
  email?: string | null
  general_availability?: string | null
  preferred_format?: string | null
  opening_talk?: string | null
  is_active?: boolean
}

export async function PATCH(req: Request) {
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

    const payload = (await req.json()) as UpdateMentorPayload
    if (!payload.mentorId) {
      return NextResponse.json({ error: 'mentorId is required.' }, { status: 400 })
    }

    const adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Build update object from only the fields that were provided
    const fields: Record<string, unknown> = {}
    if (payload.full_name !== undefined) fields.full_name = payload.full_name
    if (payload.company !== undefined) fields.company = payload.company
    if (payload.role_title !== undefined) fields.role_title = payload.role_title
    if (payload.linkedin_url !== undefined) fields.linkedin_url = payload.linkedin_url
    if (payload.bio !== undefined) fields.bio = payload.bio
    if (payload.expertise_tags !== undefined) fields.expertise_tags = payload.expertise_tags
    if (payload.email !== undefined) fields.email = payload.email
    if (payload.general_availability !== undefined) fields.general_availability = payload.general_availability
    if (payload.preferred_format !== undefined) fields.preferred_format = payload.preferred_format
    if (payload.opening_talk !== undefined) fields.opening_talk = payload.opening_talk
    if (payload.is_active !== undefined) fields.is_active = payload.is_active

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const { error } = await adminClient.from('mentors').update(fields).eq('id', payload.mentorId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
