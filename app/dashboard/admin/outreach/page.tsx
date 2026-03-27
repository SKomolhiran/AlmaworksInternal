'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useMemo, useState } from 'react'

type OutreachRow = {
  id: string
  prospect_name: string
  prospect_email: string | null
  company: string | null
  linkedin_url: string | null
  expertise_tags: string[]
  notes: string | null
  status: 'prospect' | 'contacted' | 'responded' | 'onboarded'
  converted_mentor_id: string | null
  created_at: string
}

type Semester = {
  id: string
  name: string
}

export default function AdminOutreachPage() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<OutreachRow[]>([])
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [emailByRow, setEmailByRow] = useState<Record<string, string>>({})
  const [editingByRow, setEditingByRow] = useState<Record<string, {
    prospect_name: string
    prospect_email: string
    company: string
    linkedin_url: string
    expertise_tags: string
    notes: string
    status: OutreachRow['status']
  }>>({})
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newRow, setNewRow] = useState({
    prospect_name: '',
    prospect_email: '',
    company: '',
    linkedin_url: '',
    expertise_tags: '',
    notes: '',
    status: 'prospect' as OutreachRow['status'],
  })
  const [magicLinkByRow, setMagicLinkByRow] = useState<Record<string, string>>({})
  const [recentMagicLinks, setRecentMagicLinks] = useState<Array<{ label: string; link: string }>>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachRow['status']>('all')
  const [conversionFilter, setConversionFilter] = useState<'all' | 'converted' | 'not_converted'>('not_converted')
  const [topicFilter, setTopicFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const [{ data: userData }, { data: semester }, { data: outreach }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('semesters').select('id, name').eq('is_active', true).maybeSingle(),
        supabase
          .from('outreach')
          .select('id, prospect_name, prospect_email, company, linkedin_url, expertise_tags, notes, status, converted_mentor_id, created_at')
          .order('created_at', { ascending: false }),
      ])

      setAdminId(userData.user?.id ?? null)
      setActiveSemester((semester as Semester | null) ?? null)
      const allRows = (outreach as OutreachRow[]) ?? []
      setRows(allRows)
      setEmailByRow((prev) => {
        const next = { ...prev }
        for (const r of allRows) {
          if (!(r.id in next)) next[r.id] = r.prospect_email ?? ''
        }
        return next
      })
      setEditingByRow((prev) => {
        const next = { ...prev }
        for (const r of allRows) {
          if (!(r.id in next)) {
            next[r.id] = {
              prospect_name: r.prospect_name ?? '',
              prospect_email: r.prospect_email ?? '',
              company: r.company ?? '',
              linkedin_url: r.linkedin_url ?? '',
              expertise_tags: (r.expertise_tags ?? []).join(', '),
              notes: r.notes ?? '',
              status: r.status,
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
    for (const r of rows) {
      for (const t of r.expertise_tags ?? []) {
        const clean = t.trim()
        if (clean) set.add(clean)
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (conversionFilter === 'converted' && !r.converted_mentor_id) return false
      if (conversionFilter === 'not_converted' && r.converted_mentor_id) return false
      if (topicFilter !== 'all' && !(r.expertise_tags ?? []).some((t) => t.toLowerCase() === topicFilter.toLowerCase())) return false
      if (!q) return true

      const haystack = [
        r.prospect_name,
        r.prospect_email ?? '',
        r.company ?? '',
        r.linkedin_url ?? '',
        r.notes ?? '',
        ...(r.expertise_tags ?? []),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [rows, search, statusFilter, conversionFilter, topicFilter])

  const visibleRows = useMemo(() => filteredRows.slice(0, 10), [filteredRows])

  async function convertToMentor(row: OutreachRow) {
    if (!activeSemester?.id) {
      alert('No active semester found.')
      return
    }

    const email = (emailByRow[row.id] ?? '').trim().toLowerCase()
    if (!email) {
      alert('Enter an existing platform user email first.')
      return
    }

    setConvertingId(row.id)
    try {
      const draft = editingByRow[row.id]
      const fullName = (draft?.prospect_name ?? row.prospect_name).trim()
      if (!fullName) {
        alert('Name is required before converting.')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        alert('Not authenticated. Please sign in again.')
        return
      }

      const response = await fetch('/api/admin/outreach/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          outreachId: row.id,
          semesterId: activeSemester.id,
          email,
          fullName,
          company: normalizeOptional(draft?.company ?? (row.company ?? '')),
          linkedinUrl: normalizeOptional(draft?.linkedin_url ?? (row.linkedin_url ?? '')),
          expertiseTags: parseTags(draft?.expertise_tags ?? (row.expertise_tags ?? []).join(', ')),
          notes: normalizeOptional(draft?.notes ?? (row.notes ?? '')),
        }),
      })

      const payload = (await response.json()) as { error?: string; magicLink?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Conversion failed.')
      }

      if (payload.magicLink) {
        setMagicLinkByRow((prev) => ({ ...prev, [row.id]: payload.magicLink as string }))
        setRecentMagicLinks((prev) => [
          { label: fullName, link: payload.magicLink as string },
          ...prev,
        ].slice(0, 5))
      }

      await load()
    } catch (e) {
      console.error(e)
      alert(`Convert failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setConvertingId(null)
    }
  }

  async function createOutreach() {
    if (!activeSemester?.id || !adminId) {
      alert('Missing active semester or admin identity.')
      return
    }
    if (!newRow.prospect_name.trim()) {
      alert('Name is required.')
      return
    }
    setCreating(true)
    try {
      const { error } = await supabase.from('outreach').insert({
        admin_id: adminId,
        semester_id: activeSemester.id,
        prospect_name: newRow.prospect_name.trim(),
        prospect_email: normalizeOptional(newRow.prospect_email),
        company: normalizeOptional(newRow.company),
        linkedin_url: normalizeOptional(newRow.linkedin_url),
        expertise_tags: parseTags(newRow.expertise_tags),
        notes: normalizeOptional(newRow.notes),
        status: newRow.status,
      } as never)
      if (error) throw error
      setNewRow({
        prospect_name: '',
        prospect_email: '',
        company: '',
        linkedin_url: '',
        expertise_tags: '',
        notes: '',
        status: 'prospect',
      })
      await load()
    } catch (e) {
      console.error(e)
      alert(`Create failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setCreating(false)
    }
  }

  async function saveRow(rowId: string) {
    const draft = editingByRow[rowId]
    if (!draft) return
    if (!draft.prospect_name.trim()) {
      alert('Name is required.')
      return
    }
    setSavingRowId(rowId)
    try {
      const { error } = await supabase
        .from('outreach')
        .update({
          prospect_name: draft.prospect_name.trim(),
          prospect_email: normalizeOptional(draft.prospect_email),
          company: normalizeOptional(draft.company),
          linkedin_url: normalizeOptional(draft.linkedin_url),
          expertise_tags: parseTags(draft.expertise_tags),
          notes: normalizeOptional(draft.notes),
          status: draft.status,
        })
        .eq('id', rowId)
      if (error) throw error
      await load()
    } catch (e) {
      console.error(e)
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSavingRowId(null)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#002147]">Outreach</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review imported outreach records and convert them into real mentors.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Active semester: <span className="font-mono">{activeSemester?.name ?? '—'}</span>
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {recentMagicLinks.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-green-800 mb-2">Recent magic links</p>
          <div className="space-y-2">
            {recentMagicLinks.map((m, i) => (
              <div key={`${m.label}-${i}`} className="flex gap-2 items-center">
                <span className="text-xs text-green-800 w-28 truncate">{m.label}</span>
                <input readOnly value={m.link} className="flex-1 text-[11px] text-gray-700 border border-green-200 rounded px-2 py-1 bg-white" />
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(m.link)
                    alert('Magic link copied.')
                  }}
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
        <p className="text-sm font-semibold text-[#002147] mb-3">Add outreach person</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={newRow.prospect_name}
            onChange={(e) => setNewRow((prev) => ({ ...prev, prospect_name: e.target.value }))}
            placeholder="Name *"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <input
            value={newRow.prospect_email}
            onChange={(e) => setNewRow((prev) => ({ ...prev, prospect_email: e.target.value }))}
            placeholder="Email"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <input
            value={newRow.company}
            onChange={(e) => setNewRow((prev) => ({ ...prev, company: e.target.value }))}
            placeholder="Company"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <input
            value={newRow.linkedin_url}
            onChange={(e) => setNewRow((prev) => ({ ...prev, linkedin_url: e.target.value }))}
            placeholder="LinkedIn URL"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <input
            value={newRow.expertise_tags}
            onChange={(e) => setNewRow((prev) => ({ ...prev, expertise_tags: e.target.value }))}
            placeholder="Topics (comma-separated)"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <select
            value={newRow.status}
            onChange={(e) => setNewRow((prev) => ({ ...prev, status: e.target.value as OutreachRow['status'] }))}
            className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          >
            <option value="prospect">Prospect</option>
            <option value="contacted">Contacted</option>
            <option value="responded">Responded</option>
            <option value="onboarded">Onboarded</option>
          </select>
        </div>
        <textarea
          value={newRow.notes}
          onChange={(e) => setNewRow((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Notes"
          rows={2}
          className="mt-2 w-full text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
        />
        <div className="mt-3">
          <button
            onClick={createOutreach}
            disabled={creating}
            className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Adding…' : 'Add outreach person'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company, notes…"
            className="text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | OutreachRow['status'])}
            className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          >
            <option value="all">All statuses</option>
            <option value="prospect">Prospect</option>
            <option value="contacted">Contacted</option>
            <option value="responded">Responded</option>
            <option value="onboarded">Onboarded</option>
          </select>
          <select
            value={conversionFilter}
            onChange={(e) => setConversionFilter(e.target.value as 'all' | 'converted' | 'not_converted')}
            className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          >
            <option value="all">All conversion states</option>
            <option value="not_converted">Not converted</option>
            <option value="converted">Converted</option>
          </select>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
          >
            <option value="all">All topics</option>
            {topicOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing {visibleRows.length} of {filteredRows.length} matched rows (max 10 displayed).
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading outreach records…</div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-500">
          No outreach records match the current filters.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-700">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Topics</th>
                <th className="px-4 py-3 font-semibold">LinkedIn</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold">Save</th>
                <th className="px-4 py-3 font-semibold">Convert</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top">
                  <td className="px-4 py-3 min-w-[180px]">
                    <input
                      value={editingByRow[r.id]?.prospect_name ?? ''}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], prospect_name: e.target.value } }))}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    <input
                      value={editingByRow[r.id]?.company ?? ''}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], company: e.target.value } }))}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[200px]">
                    <input
                      value={editingByRow[r.id]?.prospect_email ?? ''}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], prospect_email: value } }))
                        setEmailByRow((prev) => ({ ...prev, [r.id]: value }))
                      }}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editingByRow[r.id]?.status ?? r.status}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], status: e.target.value as OutreachRow['status'] } }))}
                      className="text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="contacted">Contacted</option>
                      <option value="responded">Responded</option>
                      <option value="onboarded">Onboarded</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 min-w-[220px]">
                    <input
                      value={editingByRow[r.id]?.expertise_tags ?? ''}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], expertise_tags: e.target.value } }))}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[220px]">
                    <input
                      value={editingByRow[r.id]?.linkedin_url ?? ''}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], linkedin_url: e.target.value } }))}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[260px]">
                    <textarea
                      rows={2}
                      value={editingByRow[r.id]?.notes ?? ''}
                      onChange={(e) => setEditingByRow((prev) => ({ ...prev, [r.id]: { ...prev[r.id], notes: e.target.value } }))}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white resize-y"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => saveRow(r.id)}
                      disabled={savingRowId === r.id}
                      className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      {savingRowId === r.id ? 'Saving…' : 'Save'}
                    </button>
                    {r.converted_mentor_id && (
                      <div className="mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                          converted
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 min-w-[320px]">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={emailByRow[r.id] ?? ''}
                        onChange={(e) => setEmailByRow((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Existing user email…"
                        className="flex-1 text-sm text-gray-800 placeholder:text-gray-500 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                        disabled={Boolean(r.converted_mentor_id)}
                      />
                      <button
                        onClick={() => convertToMentor(r)}
                        disabled={Boolean(r.converted_mentor_id) || convertingId === r.id}
                        className="px-3 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {convertingId === r.id ? 'Converting…' : r.converted_mentor_id ? 'Converted' : 'Add'}
                      </button>
                    </div>
                    {magicLinkByRow[r.id] && (
                      <div className="mt-2">
                        <p className="text-[11px] text-gray-600 mb-1">Magic link:</p>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={magicLinkByRow[r.id]}
                            className="flex-1 text-[11px] text-gray-700 border border-gray-300 rounded px-2 py-1 bg-gray-50"
                          />
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(magicLinkByRow[r.id])
                              alert('Magic link copied.')
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    )}
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

function parseTags(tagsText: string): string[] {
  return tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function normalizeOptional(v: string): string | null {
  const value = v.trim()
  return value ? value : null
}

