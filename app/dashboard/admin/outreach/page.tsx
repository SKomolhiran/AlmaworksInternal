'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useMemo, useState } from 'react'
import TagInput from '@/components/TagInput'

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

const STATUS_COLORS: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-500',
  contacted: 'bg-blue-50 text-blue-600',
  responded: 'bg-amber-50 text-amber-600',
  onboarded: 'bg-green-50 text-green-600',
}

export default function AdminOutreachPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<OutreachRow[]>([])
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null)
  const [activeSemesterName, setActiveSemesterName] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentMagicLinks, setRecentMagicLinks] = useState<{ label: string; link: string }[]>([])
  const [magicLinkByRow, setMagicLinkByRow] = useState<Record<string, string>>({})

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [aoName, setAoName] = useState('')
  const [aoEmail, setAoEmail] = useState('')
  const [aoCompany, setAoCompany] = useState('')
  const [aoLinkedin, setAoLinkedin] = useState('')
  const [aoTagsArr, setAoTagsArr] = useState<string[]>([])
  const [aoNotes, setAoNotes] = useState('')
  const [aoStatus, setAoStatus] = useState<OutreachRow['status']>('prospect')
  const [aoLoading, setAoLoading] = useState(false)
  const [aoError, setAoError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OutreachRow['status']>('all')
  const [conversionFilter, setConversionFilter] = useState<'all' | 'converted' | 'not_converted'>('not_converted')

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<OutreachRow & { expertise_tags_arr: string[] }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  // Convert to mentor
  const [convertEmail, setConvertEmail] = useState<Record<string, string>>({})
  const [convertingId, setConvertingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: userData }, { data: sem }, { data: outreach }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('semesters').select('id, name').eq('is_active', true).maybeSingle(),
      supabase.from('outreach').select('id, prospect_name, prospect_email, company, linkedin_url, expertise_tags, notes, status, converted_mentor_id, created_at').order('created_at', { ascending: false }),
    ])
    setAdminId(userData.user?.id ?? null)
    setActiveSemesterId((sem as { id: string; name: string } | null)?.id ?? null)
    setActiveSemesterName((sem as { id: string; name: string } | null)?.name ?? null)
    const all = (outreach as OutreachRow[]) ?? []
    setRows(all)
    setConvertEmail(prev => {
      const next = { ...prev }
      for (const r of all) if (!(r.id in next)) next[r.id] = r.prospect_email ?? ''
      return next
    })
    setLoading(false)
  }

  useEffect(() => { void (async () => { await load() })() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allTagSuggestions = useMemo(() =>
    [...new Set(rows.flatMap(r => r.expertise_tags ?? []))].sort()
  , [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (conversionFilter === 'converted' && !r.converted_mentor_id) return false
      if (conversionFilter === 'not_converted' && r.converted_mentor_id) return false
      if (!q) return true
      return [r.prospect_name, r.prospect_email ?? '', r.company ?? '', r.notes ?? '', ...(r.expertise_tags ?? [])].join(' ').toLowerCase().includes(q)
    })
  }, [rows, search, statusFilter, conversionFilter])

  async function addOutreach(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSemesterId || !adminId) { setAoError('No active semester or not authenticated.'); return }
    setAoLoading(true); setAoError(null)
    const { data, error } = await supabase.from('outreach').insert({
      admin_id: adminId,
      semester_id: activeSemesterId,
      prospect_name: aoName.trim(),
      prospect_email: aoEmail.trim() || null,
      company: aoCompany.trim() || null,
      linkedin_url: aoLinkedin.trim() || null,
      expertise_tags: aoTagsArr,
      status: aoStatus,
      notes: aoNotes.trim() || null,
    } as never).select('id, prospect_name, prospect_email, company, linkedin_url, expertise_tags, notes, status, converted_mentor_id, created_at').single()
    if (error) {
      setAoError(error.message)
    } else {
      setAoName(''); setAoEmail(''); setAoCompany(''); setAoLinkedin(''); setAoTagsArr([]); setAoNotes(''); setAoStatus('prospect')
      setRows(prev => [data as OutreachRow, ...prev])
      setShowAdd(false)
    }
    setAoLoading(false)
  }

  function openEdit(r: OutreachRow) {
    setEditingId(r.id)
    setEditDraft({ prospect_name: r.prospect_name, prospect_email: r.prospect_email, company: r.company, linkedin_url: r.linkedin_url, notes: r.notes, status: r.status, expertise_tags_arr: r.expertise_tags ?? [] })
  }

  async function saveRow(id: string) {
    setSavingId(id)
    const { error } = await supabase.from('outreach').update({
      prospect_name: editDraft.prospect_name?.trim(),
      prospect_email: editDraft.prospect_email?.trim() || null,
      company: editDraft.company?.trim() || null,
      linkedin_url: editDraft.linkedin_url?.trim() || null,
      expertise_tags: editDraft.expertise_tags_arr ?? [],
      notes: editDraft.notes?.trim() || null,
      status: editDraft.status,
    }).eq('id', id)
    if (!error) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...editDraft as OutreachRow, expertise_tags: editDraft.expertise_tags_arr ?? r.expertise_tags } : r))
      setEditingId(null)
    }
    setSavingId(null)
  }

  async function convertToMentor(row: OutreachRow) {
    if (!activeSemesterId) return
    const email = (convertEmail[row.id] ?? '').trim().toLowerCase()
    if (!email) return
    setConvertingId(row.id)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setConvertingId(null); return }
    const res = await fetch('/api/admin/outreach/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        outreachId: row.id,
        semesterId: activeSemesterId,
        email,
        fullName: row.prospect_name.trim(),
        company: row.company,
        linkedinUrl: row.linkedin_url,
        expertiseTags: row.expertise_tags,
        notes: row.notes,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      if (json.magicLink) {
        setMagicLinkByRow(prev => ({ ...prev, [row.id]: json.magicLink }))
        setRecentMagicLinks(prev => [{ label: row.prospect_name, link: json.magicLink }, ...prev].slice(0, 5))
      }
      await load()
    }
    setConvertingId(null)
  }

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#002147]">Outreach</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track prospects and convert them to mentors for{' '}
            <span className="font-medium text-gray-700">{activeSemesterName ?? '—'}</span>
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setAoError(null) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add prospect
        </button>
      </div>

      {/* Magic links */}
      {recentMagicLinks.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Recent magic links</p>
          {recentMagicLinks.map((m, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-green-800 w-28 shrink-0 truncate">{m.label}</span>
              <input readOnly value={m.link} className="flex-1 text-[11px] text-gray-700 border border-green-200 rounded-lg px-2.5 py-1.5 bg-white" />
              <button onClick={() => navigator.clipboard.writeText(m.link)}
                className="px-2.5 py-1.5 text-xs font-medium border border-green-200 rounded-lg bg-white hover:bg-green-100 transition-colors shrink-0">
                Copy
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addOutreach} className="bg-white border border-gray-200 rounded-xl p-5 mb-5 space-y-4">
          <p className="text-sm font-semibold text-[#002147]">New prospect</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
              <input required value={aoName} onChange={e => setAoName(e.target.value)} placeholder="Jane Smith"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={aoEmail} onChange={e => setAoEmail(e.target.value)} placeholder="jane@example.com"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input value={aoCompany} onChange={e => setAoCompany(e.target.value)} placeholder="Acme Inc."
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
              <input value={aoLinkedin} onChange={e => setAoLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={aoStatus} onChange={e => setAoStatus(e.target.value as OutreachRow['status'])}
                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                <option value="prospect">Prospect</option>
                <option value="contacted">Contacted</option>
                <option value="responded">Responded</option>
                <option value="onboarded">Onboarded</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
              <TagInput value={aoTagsArr} onChange={setAoTagsArr} suggestions={allTagSuggestions} placeholder="Search or create tags…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={aoNotes} onChange={e => setAoNotes(e.target.value)} placeholder="Any notes…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
            </div>
          </div>
          {aoError && <p className="text-xs text-red-500">{aoError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={aoLoading}
              className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors">
              {aoLoading ? 'Adding…' : 'Add prospect'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAoError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input type="search" placeholder="Search name, email, company, notes…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0 flex-wrap">
          {(['all', 'prospect', 'contacted', 'responded', 'onboarded'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white text-[#002147] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={conversionFilter} onChange={e => setConversionFilter(e.target.value as typeof conversionFilter)}
          className="text-xs text-gray-600 border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 shrink-0">
          <option value="all">All</option>
          <option value="not_converted">Not converted</option>
          <option value="converted">Converted</option>
        </select>
        <p className="text-xs text-gray-400 shrink-0">{filtered.length} of {rows.length}</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-[#002147] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 px-1">No outreach records match the current filters.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {filtered.map(r => (
            <div key={r.id}>
              {/* Row */}
              <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                <div className="flex-1 min-w-0 grid sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {/* Name / email / company */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#002147] truncate">{r.prospect_name}</p>
                    {r.prospect_email && <p className="text-xs text-gray-500 truncate">{r.prospect_email}</p>}
                    {r.company && <p className="text-xs text-gray-400 truncate">{r.company}</p>}
                  </div>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 content-start">
                    {(r.expertise_tags ?? []).map(t => (
                      <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                    ))}
                  </div>
                  {/* Status + converted */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                    {r.converted_mentor_id && (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">Converted</span>
                    )}
                  </div>
                </div>
                <button onClick={() => editingId === r.id ? setEditingId(null) : openEdit(r)}
                  className="text-xs font-medium text-gray-500 hover:text-[#002147] px-2 py-1 rounded hover:bg-gray-100 transition-colors shrink-0">
                  {editingId === r.id ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {/* Inline edit */}
              {editingId === r.id && (
                <div className="bg-gray-50/80 border-t border-gray-100 px-5 py-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {([
                      ['Name', 'prospect_name', 'text', 'Jane Smith'],
                      ['Email', 'prospect_email', 'email', 'jane@example.com'],
                      ['Company', 'company', 'text', 'Acme Inc.'],
                      ['LinkedIn URL', 'linkedin_url', 'url', 'https://linkedin.com/in/…'],
                    ] as const).map(([label, key, type, ph]) => (
                      <div key={key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                        <input type={type} value={(editDraft[key] as string) ?? ''} placeholder={ph}
                          onChange={e => setEditDraft(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select value={editDraft.status ?? r.status} onChange={e => setEditDraft(p => ({ ...p, status: e.target.value as OutreachRow['status'] }))}
                        className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                        <option value="prospect">Prospect</option>
                        <option value="contacted">Contacted</option>
                        <option value="responded">Responded</option>
                        <option value="onboarded">Onboarded</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
                      <TagInput value={editDraft.expertise_tags_arr ?? []} onChange={tags => setEditDraft(p => ({ ...p, expertise_tags_arr: tags }))}
                        suggestions={allTagSuggestions} placeholder="Search or create tags…" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <textarea rows={2} value={editDraft.notes ?? ''}
                        onChange={e => setEditDraft(p => ({ ...p, notes: e.target.value }))}
                        className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveRow(r.id)} disabled={savingId === r.id}
                      className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors">
                      {savingId === r.id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                      Cancel
                    </button>
                  </div>

                  {/* Convert to mentor */}
                  {!r.converted_mentor_id && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-600 mb-2">Convert to mentor</p>
                      <div className="flex gap-2 max-w-sm">
                        <input type="email" placeholder="Existing platform user email…"
                          value={convertEmail[r.id] ?? ''}
                          onChange={e => setConvertEmail(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                        <button onClick={() => convertToMentor(r)} disabled={convertingId === r.id || !convertEmail[r.id]?.trim()}
                          className="px-3 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors whitespace-nowrap">
                          {convertingId === r.id ? 'Converting…' : 'Convert'}
                        </button>
                      </div>
                      {magicLinkByRow[r.id] && (
                        <div className="mt-2 flex gap-2 items-center max-w-sm">
                          <input readOnly value={magicLinkByRow[r.id]}
                            className="flex-1 text-[11px] text-gray-700 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-gray-50" />
                          <button onClick={() => navigator.clipboard.writeText(magicLinkByRow[r.id])}
                            className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
