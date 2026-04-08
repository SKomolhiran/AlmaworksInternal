import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/src/db/types'

const VALID_STATUSES = new Set(['prospect', 'contacted', 'responded', 'onboarded'] as const)
type OutreachStatus = Database['public']['Enums']['outreach_status']

type BulkStatusPayload = {
  ids: string[]
  status: OutreachStatus
  semesterId: string
}

const MAX_BULK_IDS = 200

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

    const userClient = createClient<Database>(url, anonKey, {
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

    const adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const payload = (await req.json()) as BulkStatusPayload
    if (!payload.ids?.length || !payload.status || !payload.semesterId) {
      return NextResponse.json({ error: 'Missing ids, status, or semesterId.' }, { status: 400 })
    }

    if (!VALID_STATUSES.has(payload.status)) {
      return NextResponse.json({ error: `Invalid status: ${payload.status}` }, { status: 400 })
    }

    if (payload.ids.length > MAX_BULK_IDS) {
      return NextResponse.json({ error: `Too many ids (max ${MAX_BULK_IDS}).` }, { status: 400 })
    }

    // Read current status of each row for activity log, scoped by semester
    const { data: currentRows, error: fetchErr } = await adminClient
      .from('outreach')
      .select('id, status')
      .in('id', payload.ids)
      .eq('semester_id', payload.semesterId)
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 400 })
    }

    // Bulk update, scoped by semester
    const { error: updateErr } = await adminClient
      .from('outreach')
      .update({ status: payload.status })
      .in('id', payload.ids)
      .eq('semester_id', payload.semesterId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 })
    }

    // Insert activity log entries for each changed row
    const activityEntries = (currentRows ?? [])
      .filter(r => r.status !== payload.status)
      .map(r => ({
        outreach_id: r.id,
        semester_id: payload.semesterId,
        admin_id: user.id,
        action_type: 'status_changed' as const,
        detail: { from: r.status, to: payload.status },
      }))

    if (activityEntries.length > 0) {
      const { error: activityErr } = await adminClient.from('outreach_activity_log').insert(activityEntries)
      if (activityErr) {
        console.error('Failed to insert activity log entries:', activityErr.message)
      }
    }

    return NextResponse.json({ ok: true, updated: payload.ids.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    )
  }
}
