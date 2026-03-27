'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

type PendingUser = {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

type Mentor = {
  id: string
  full_name: string
  company: string | null
  expertise_tags: string[]
  is_active: boolean
}

type Founder = {
  name: string
  email?: string
  phone?: string
}

type Startup = {
  id: string
  name: string
  industry: string | null
  stage: string | null
  founder_name: string | null
  founders: Founder[]
}

type Session = {
  id: string
  status: string
  topic: string | null
  session_dates: { date: string; label: string | null } | null
  mentors: { full_name: string } | null
  startups: { name: string } | null
}

type SessionDate = {
  id: string
  date: string
  label: string | null
}

type Tab = 'users' | 'schedule' | 'mentors' | 'startups'

export default function AdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('users')

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [startups, setStartups] = useState<Startup[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([])
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null)
  const [selectedSessionDateId, setSelectedSessionDateId] = useState<string | null>(null)
  const [assignMentorId, setAssignMentorId] = useState<string>('')
  const [assignStartupId, setAssignStartupId] = useState<string>('')
  const [assignTopic, setAssignTopic] = useState<string>('')
  const [assigning, setAssigning] = useState<boolean>(false)

  // Approval state
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<string | null>(null)

  async function loadAll() {
    const [usersRes, mentorsRes, startupsRes, sessionsRes, semesterRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, created_at').eq('status', 'pending').order('created_at'),
      supabase.from('mentors').select('id, full_name, company, expertise_tags, is_active').order('full_name'),
      supabase.from('startups').select('id, name, industry, stage, founder_name, founders').order('name'),
      supabase.from('sessions').select('id, status, topic, session_dates(date, label), mentors(full_name), startups(name)').order('date', { referencedTable: 'session_dates' }),
      supabase.from('semesters').select('id').eq('is_active', true).maybeSingle(),
    ])
    setPendingUsers((usersRes.data as PendingUser[]) ?? [])
    setMentors((mentorsRes.data as Mentor[]) ?? [])
    setStartups((startupsRes.data as Startup[]) ?? [])
    setSessions((sessionsRes.data as Session[]) ?? [])

    const semId = (semesterRes.data as { id: string } | null)?.id ?? null
    setActiveSemesterId(semId)
    if (semId) {
      const { data: dateRows } = await supabase
        .from('session_dates')
        .select('id, date, label')
        .eq('semester_id', semId)
        .order('date')
      const dates = (dateRows as SessionDate[]) ?? []
      setSessionDates(dates)
      setSelectedSessionDateId(prev => prev ?? (dates[0]?.id ?? null))
    } else {
      setSessionDates([])
      setSelectedSessionDateId(null)
    }
  }

  useEffect(() => {
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function approveUser(userId: string) {
    const role = roleSelections[userId]
    if (!role) return alert('Select a role first.')
    setApproving(userId)
    await supabase
      .from('profiles')
      .update({ status: 'approved', role })
      .eq('id', userId)
    setPendingUsers(prev => prev.filter(u => u.id !== userId))
    setApproving(null)
  }

  async function rejectUser(userId: string) {
    if (!confirm('Reject this user?')) return
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId)
    setPendingUsers(prev => prev.filter(u => u.id !== userId))
  }

  const selectedDate = sessionDates.find(d => d.id === selectedSessionDateId) ?? null
  const sessionsForSelectedDate = sessions.filter(s => {
    if (!selectedDate) return false
    return s.session_dates?.date === selectedDate.date
  })

  async function assignForWeek() {
    if (!activeSemesterId || !selectedSessionDateId) {
      alert('No active semester or session date configured.')
      return
    }
    if (!assignMentorId || !assignStartupId) {
      alert('Pick both a mentor and a startup.')
      return
    }
    setAssigning(true)
    try {
      const { error } = await supabase.from('sessions').insert({
        mentor_id: assignMentorId,
        startup_id: assignStartupId,
        session_date_id: selectedSessionDateId,
        semester_id: activeSemesterId,
        topic: assignTopic.trim() ? assignTopic.trim() : null,
        status: 'confirmed',
      } as never)
      if (error) throw error

      // refresh sessions list
      const { data: sessionRows } = await supabase
        .from('sessions')
        .select('id, status, topic, session_dates(date, label), mentors(full_name), startups(name)')
        .order('date', { referencedTable: 'session_dates' })
      setSessions((sessionRows as Session[]) ?? [])

      setAssignTopic('')
    } catch (e) {
      console.error(e)
      alert(`Assignment failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAssigning(false)
    }
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'users', label: 'Pending Users', badge: pendingUsers.length },
    { id: 'schedule', label: 'Schedule' },
    { id: 'mentors', label: 'Mentors' },
    { id: 'startups', label: 'Startups' },
  ]

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#002147]">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, review schedules, and oversee the program.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-[#002147] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pending Users */}
      {tab === 'users' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Approve new registrations and assign their role before they can access the platform.
          </p>
          {pendingUsers.length === 0 ? (
            <p className="text-sm text-gray-400">No pending registrations.</p>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map(u => (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#002147]">{u.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Registered {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={roleSelections[u.id] ?? ''}
                      onChange={e => setRoleSelections(prev => ({ ...prev, [u.id]: e.target.value }))}
                      className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                    >
                      <option value="">Select role…</option>
                      <option value="mentor">Mentor</option>
                      <option value="startup">Startup</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => approveUser(u.id)}
                      disabled={approving === u.id || !roleSelections[u.id]}
                      className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
                    >
                      {approving === u.id ? '…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => rejectUser(u.id)}
                      className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      {tab === 'schedule' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Pick a week to see mentor ↔ startup assignments. If a week has none, assign using current mentors.
          </p>

          {sessionDates.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">No session dates found for the active semester.</p>
              <p className="text-xs text-gray-400 mt-1">Create `session_dates` rows first (Admin-only).</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#002147]">Week</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Active semester: <span className="font-mono">{activeSemesterId ?? '—'}</span>
                    </p>
                  </div>
                  <select
                    value={selectedSessionDateId ?? ''}
                    onChange={e => setSelectedSessionDateId(e.target.value)}
                    className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  >
                    {sessionDates.map(d => (
                      <option key={d.id} value={d.id}>
                        {(d.label ? `${d.label} · ` : '') + d.date}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#002147]">Assignments</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selectedDate ? `${selectedDate.label ?? 'Week'} · ${selectedDate.date}` : '—'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                    {sessionsForSelectedDate.length} session{sessionsForSelectedDate.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {sessionsForSelectedDate.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600 mb-3">No assignments yet for this week.</p>
                    <p className="text-xs text-gray-600 mb-3">
                      Note: CSV imports populate <code>outreach</code>. They do not create rows in <code>mentors</code>, so only converted/created mentors appear here.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      <select
                        value={assignStartupId}
                        onChange={e => setAssignStartupId(e.target.value)}
                        className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                      >
                        <option value="">Select startup…</option>
                        {startups.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <select
                        value={assignMentorId}
                        onChange={e => setAssignMentorId(e.target.value)}
                        className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                      >
                        <option value="">Select mentor…</option>
                        {mentors.filter(m => m.is_active).map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}{m.company ? ` · ${m.company}` : ''}</option>
                        ))}
                      </select>
                      <input
                        value={assignTopic}
                        onChange={e => setAssignTopic(e.target.value)}
                        placeholder="Topic (optional)…"
                        className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                      />
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={assignForWeek}
                        disabled={assigning || !assignMentorId || !assignStartupId}
                        className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
                      >
                        {assigning ? 'Assigning…' : 'Assign mentor to startup'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sessionsForSelectedDate.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-[#002147]">
                            {s.startups?.name ?? '—'} ↔ {s.mentors?.full_name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {s.session_dates?.label ?? ''} · {s.session_dates?.date ?? ''}
                            {s.topic ? ` · ${s.topic}` : ''}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          s.status === 'confirmed' ? 'text-green-600 bg-green-50' :
                          s.status === 'declined' ? 'text-red-500 bg-red-50' :
                          'text-yellow-600 bg-yellow-50'
                        }`}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mentors */}
      {tab === 'mentors' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{mentors.length} mentor{mentors.length !== 1 ? 's' : ''} registered.</p>
          {mentors.length === 0 ? (
            <div>
              <p className="text-sm text-gray-500">No mentors yet.</p>
              <p className="text-xs text-gray-500 mt-1">
                Outreach imports add prospects to <code>outreach</code>; they are not auto-created in <code>mentors</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mentors.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[#002147]">{m.full_name}</p>
                    <p className="text-xs text-gray-500">{m.company ?? '—'}</p>
                    {m.expertise_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.expertise_tags.map(t => (
                          <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Startups */}
      {tab === 'startups' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">{startups.length} startup{startups.length !== 1 ? 's' : ''} registered.</p>
          {startups.length === 0 ? (
            <p className="text-sm text-gray-400">No startups yet.</p>
          ) : (
            <div className="space-y-3">
              {startups.map(s => (
                <div key={s.id} className="px-5 py-4 bg-white rounded-xl border border-gray-100">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-[#002147]">{s.name}</p>
                      <p className="text-xs text-gray-500">{[s.industry, s.stage].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                  {s.founders && s.founders.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-gray-50">
                      {s.founders.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="font-medium text-[#002147]">{f.name}</span>
                          {f.email && <span>{f.email}</span>}
                          {f.phone && <span className="text-gray-400">{f.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
