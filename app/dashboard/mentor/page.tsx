'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

type SessionDate = {
  id: string
  date: string
  label: string | null
}

type Availability = {
  session_date_id: string
  is_available: boolean
}

type Session = {
  id: string
  status: string
  topic: string | null
  session_dates: { date: string; label: string | null } | null
  startups: { name: string } | null
}

export default function MentorDashboard() {
  const supabase = createClient()
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [sessions, setSessions] = useState<Session[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load active semester's session dates
      const { data: dates } = await supabase
        .from('session_dates')
        .select('id, date, label, semester_id, semesters!inner(is_active)')
        .eq('semesters.is_active', true)
        .order('date')
      setSessionDates((dates as SessionDate[]) ?? [])

      // Load existing availability
      const { data: avail } = await supabase
        .from('availability')
        .select('session_date_id, is_available')
        .eq('user_id', user.id)
      const map: Record<string, boolean> = {}
      for (const row of (avail as Availability[]) ?? []) {
        map[row.session_date_id] = row.is_available
      }
      setAvailability(map)

      // Load confirmed sessions for this mentor
      const { data: mentorRow } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (mentorRow) {
        const { data: mySessions } = await supabase
          .from('sessions')
          .select('id, status, topic, session_dates(date, label), startups(name)')
          .eq('mentor_id', mentorRow.id)
          .order('date', { referencedTable: 'session_dates' })
        setSessions((mySessions as Session[]) ?? [])
      }
    }
    load()
  }, [supabase])

  function toggleDate(dateId: string) {
    setAvailability(prev => ({ ...prev, [dateId]: !prev[dateId] }))
  }

  async function saveAvailability() {
    if (!userId) return
    setSaving(true)
    const rows = sessionDates.map(d => ({
      user_id: userId,
      session_date_id: d.id,
      is_available: availability[d.id] ?? false,
    }))
    await supabase
      .from('availability')
      .upsert(rows, { onConflict: 'user_id,session_date_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const confirmedSessions = sessions.filter(s => s.status === 'confirmed')
  const pendingSessions = sessions.filter(s => s.status === 'pending')

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#002147]">My Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your availability and view scheduled sessions.</p>
      </div>

      {/* Scheduled sessions */}
      <section>
        <h2 className="text-base font-semibold text-[#002147] mb-3">Confirmed Sessions</h2>
        {confirmedSessions.length === 0 ? (
          <p className="text-sm text-gray-400">No confirmed sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {confirmedSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-[#002147]">{s.startups?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {s.session_dates?.label ?? ''} · {s.session_dates?.date ?? ''}
                    {s.topic ? ` · ${s.topic}` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                  Confirmed
                </span>
              </div>
            ))}
          </div>
        )}

        {pendingSessions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending</p>
            {pendingSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-[#002147]">{s.startups?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {s.session_dates?.label ?? ''} · {s.session_dates?.date ?? ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Availability */}
      <section>
        <h2 className="text-base font-semibold text-[#002147] mb-1">Friday Availability</h2>
        <p className="text-sm text-gray-500 mb-4">
          Select the Fridays you&apos;re available for mentoring sessions this semester.
        </p>

        {sessionDates.length === 0 ? (
          <p className="text-sm text-gray-400">No session dates have been set for this semester yet.</p>
        ) : (
          <div className="space-y-2">
            {sessionDates.map(d => (
              <label
                key={d.id}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:border-[#75AADB]/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={availability[d.id] ?? false}
                  onChange={() => toggleDate(d.id)}
                  className="w-4 h-4 accent-[#002147] rounded"
                />
                <div>
                  <p className="text-sm font-medium text-[#002147]">
                    {d.label ?? d.date}
                  </p>
                  <p className="text-xs text-gray-400">{d.date}</p>
                </div>
              </label>
            ))}

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={saveAvailability}
                disabled={saving}
                className="px-5 py-2.5 bg-[#002147] text-white text-sm font-medium rounded-full hover:bg-[#002147]/90 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : 'Save availability'}
              </button>
              {saved && <p className="text-sm text-green-600">Saved!</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
