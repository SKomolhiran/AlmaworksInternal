'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useMemo, useState } from 'react'

type MentorRow = {
  id: string
  user_id: string
  full_name: string
  company: string | null
  role_title: string | null
  linkedin_url: string | null
  expertise_tags: string[]
  bio: string | null
  is_active: boolean
  semester_id: string
}

type Semester = {
  id: string
  name: string
}

type NewMentor = {
  full_name: string
  email: string
  company: string
  role_title: string
  linkedin_url: string
  expertise_tags: string
  bio: string
  is_active: boolean
}

export default function AdminMentorsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<MentorRow[]>([])
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [magicLinks, setMagicLinks] = useState<Array<{ label: string; link: string }>>([])
  const [editing, setEditing] = useState<Record<string, {
    full_name: string
    company: string
    role_title: string
    linkedin_url: string
    expertise_tags: string
    bio: string
    is_active: boolean
  }>>({})
  const [newMentor, setNewMentor] = useState<NewMentor>({
    full_name: '',
    email: '',
    company: '',
    role_title: '',
    linkedin_url: '',
    expertise_tags: '',
    bio: '',
    is_active: true,
  })
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [topicFilter, setTopicFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const { data: semester } = await supabase.from('semesters').select('id, name').eq('is_active', true).maybeSingle()
      setActiveSemester((semester as Semester | null) ?? null)
      const semId = (semester as Semester | null)?.id
      if (!semId) {
        setRows([])
        return
      }

      const { data } = await supabase
        .from('mentors')
        .select('id, user_id, full_name, company, role_title, linkedin_url, expertise_tags, bio, is_active, semester_id')
        .eq('semester_id', semId)
        .order('full_name')
      const mentors = (data as MentorRow[]) ?? []
      setRows(mentors)
      setEditing((prev) => {
        const next = { ...prev }
        for (const r of mentors) {
          if (!(r.id in next)) {
            next[r.id] = {
              full_name: r.full_name ?? '',
              company: r.company ?? '',
              role_title: r.role_title ?? '',
              linkedin_url: r.linkedin_url ?? '',
              expertise_tags: (r.expertise_tags ?? []).join(', '),
              bio: r.bio ?? '',
              is_active: r.is_active,
            }
          }
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const topicOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => (r.expertise_tags ?? []).forEach((t) => t && set.add(t)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (activeFilter === 'active' && !r.is_active) return false
      if (activeFilter === 'inactive' && r.is_active) return false
      if (topicFilter !== 'all' && !(r.expertise_tags ?? []).some((t) => t.toLowerCase() === topicFilter.toLowerCase())) return false
      if (!q) return true
      const hay = [r.full_name, r.company ?? '', r.role_title ?? '', r.linkedin_url ?? '', r.bio ?? '', ...(r.expertise_tags ?? [])].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, activeFilter, topicFilter])

  const visibleRows = useMemo(() => filteredRows.slice(0, 10), [filteredRows])

  async function addMentor() {
    if (!activeSemester?.id) return alert('No active semester.')
    if (!newMentor.full_name.trim() || !newMentor.email.trim()) return alert('Name and email are required.')

    setAdding(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return alert('Not authenticated.')

      const res = await fetch('/api/admin/mentors/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          semesterId: activeSemester.id,
          email: newMentor.email.trim().toLowerCase(),
          fullName: newMentor.full_name.trim(),
          company: normalizeOptional(newMentor.company),
          roleTitle: normalizeOptional(newMentor.role_title),
          linkedinUrl: normalizeOptional(newMentor.linkedin_url),
          expertiseTags: parseTags(newMentor.expertise_tags),
          bio: normalizeOptional(newMentor.bio),
          isActive: newMentor.is_active,
        }),
      })
      const payload = (await res.json()) as { error?: string; magicLink?: string }
      if (!res.ok) throw new Error(payload.error ?? 'Add mentor failed.')

      if (payload.magicLink) {
        setMagicLinks((prev) => [{ label: newMentor.full_name, link: payload.magicLink as string }, ...prev].slice(0, 5))
      }
      setNewMentor({
        full_name: '',
        email: '',
        company: '',
        role_title: '',
        linkedin_url: '',
        expertise_tags: '',
        bio: '',
        is_active: true,
      })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Add mentor failed.')
    } finally {
      setAdding(false)
    }
  }

  async function saveMentor(rowId: string) {
    const draft = editing[rowId]
    if (!draft || !draft.full_name.trim()) return alert('Name is required.')
    setSavingRowId(rowId)
    try {
      const { error } = await supabase
        .from('mentors')
        .update({
          full_name: draft.full_name.trim(),
          company: normalizeOptional(draft.company),
          role_title: normalizeOptional(draft.role_title),
          linkedin_url: normalizeOptional(draft.linkedin_url),
          expertise_tags: parseTags(draft.expertise_tags),
          bio: normalizeOptional(draft.bio),
          is_active: draft.is_active,
        })
        .eq('id', rowId)
      if (error) throw error
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSavingRowId(null)
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#002147]">Mentors</h1>
          <p className="text-sm text-gray-500 mt-1">Add and manage mentors in a table view.</p>
          <p className="text-xs text-gray-500 mt-1">Active semester: <span className="font-mono">{activeSemester?.name ?? '—'}</span></p>
        </div>
        <button onClick={load} className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Refresh</button>
      </div>

      {magicLinks.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Recent magic links</p>
          <div className="space-y-2">
            {magicLinks.map((m, i) => (
              <div key={`${m.label}-${i}`} className="flex gap-2 items-center">
                <span className="text-xs text-green-800 w-28 truncate">{m.label}</span>
                <input readOnly value={m.link} className="flex-1 text-[11px] text-gray-700 border border-green-200 rounded px-2 py-1 bg-white" />
                <button
                  onClick={async () => { await navigator.clipboard.writeText(m.link); alert('Magic link copied.') }}
                  className="px-2 py-1 text-xs border border-green-200 rounded bg-white hover:bg-green-100"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <p className="text-sm font-semibold text-[#002147] mb-3">Add mentor</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={newMentor.full_name} onChange={(e) => setNewMentor((p) => ({ ...p, full_name: e.target.value }))} placeholder="Name *" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <input value={newMentor.email} onChange={(e) => setNewMentor((p) => ({ ...p, email: e.target.value }))} placeholder="Email *" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <input value={newMentor.company} onChange={(e) => setNewMentor((p) => ({ ...p, company: e.target.value }))} placeholder="Company" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <input value={newMentor.role_title} onChange={(e) => setNewMentor((p) => ({ ...p, role_title: e.target.value }))} placeholder="Role title" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <input value={newMentor.linkedin_url} onChange={(e) => setNewMentor((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="LinkedIn URL" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <input value={newMentor.expertise_tags} onChange={(e) => setNewMentor((p) => ({ ...p, expertise_tags: e.target.value }))} placeholder="Topics (comma-separated)" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <select value={newMentor.is_active ? 'active' : 'inactive'} onChange={(e) => setNewMentor((p) => ({ ...p, is_active: e.target.value === 'active' }))} className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <textarea value={newMentor.bio} onChange={(e) => setNewMentor((p) => ({ ...p, bio: e.target.value }))} rows={2} placeholder="Bio" className="mt-2 w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
        <div className="mt-3">
          <button onClick={addMentor} disabled={adding} className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50">
            {adding ? 'Adding…' : 'Add mentor + generate magic link'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mentor fields…" className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2" />
          <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')} className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2">
            <option value="all">All active states</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2">
            <option value="all">All topics</option>
            {topicOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-2">Showing {visibleRows.length} of {filteredRows.length} matched rows (max 10 displayed).</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading mentors…</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 p-5">No mentors match current filters.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-700">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Topics</th>
                <th className="px-4 py-3 font-semibold">LinkedIn</th>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">Bio</th>
                <th className="px-4 py-3 font-semibold">Save</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top">
                  <td className="px-4 py-3 min-w-[180px]"><input value={editing[r.id]?.full_name ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], full_name: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3 min-w-[160px]"><input value={editing[r.id]?.company ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], company: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3 min-w-[160px]"><input value={editing[r.id]?.role_title ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], role_title: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3 min-w-[220px]"><input value={editing[r.id]?.expertise_tags ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], expertise_tags: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3 min-w-[220px]"><input value={editing[r.id]?.linkedin_url ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], linkedin_url: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3"><select value={editing[r.id]?.is_active ? 'active' : 'inactive'} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], is_active: e.target.value === 'active' } }))} className="text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5"><option value="active">Active</option><option value="inactive">Inactive</option></select></td>
                  <td className="px-4 py-3 min-w-[240px]"><textarea rows={2} value={editing[r.id]?.bio ?? ''} onChange={(e) => setEditing((p) => ({ ...p, [r.id]: { ...p[r.id], bio: e.target.value } }))} className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5" /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => saveMentor(r.id)} disabled={savingRowId === r.id} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50">
                      {savingRowId === r.id ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function parseTags(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

function normalizeOptional(value: string): string | null {
  const t = value.trim()
  return t ? t : null
}

