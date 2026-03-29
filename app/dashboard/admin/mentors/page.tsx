'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Fragment, useEffect, useMemo, useState } from 'react'
import TagInput from '@/components/TagInput'

type SortDir = 'asc' | 'desc'

type MentorRow = {
  id: string
  full_name: string
  company: string | null
  role_title: string | null
  linkedin_url: string | null
  expertise_tags: string[]
  bio: string | null
  is_active: boolean
  slug: string | null
  email: string | null
  general_availability: string | null
  preferred_format: string | null
  opening_talk: string | null
}

export default function AdminMentorsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<MentorRow[]>([])
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null)
  const [activeSemesterName, setActiveSemesterName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [amName, setAmName] = useState('')
  const [amEmail, setAmEmail] = useState('')
  const [amCompany, setAmCompany] = useState('')
  const [amRoleTitle, setAmRoleTitle] = useState('')
  const [amLinkedin, setAmLinkedin] = useState('')
  const [amBio, setAmBio] = useState('')
  const [amTagsArr, setAmTagsArr] = useState<string[]>([])
  const [amGeneralAvail, setAmGeneralAvail] = useState('')
  const [amFormat, setAmFormat] = useState('')
  const [amOpeningTalk, setAmOpeningTalk] = useState('')
  const [amLoading, setAmLoading] = useState(false)
  const [amError, setAmError] = useState<string | null>(null)
  const [magicLinks, setMagicLinks] = useState<{ label: string; link: string }[]>([])

  // Search / filter / sort
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortKey, setSortKey] = useState<'full_name' | 'company' | 'is_active'>('full_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<MentorRow>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data: sem } = await supabase.from('semesters').select('id, name').eq('is_active', true).maybeSingle()
    setActiveSemesterId((sem as { id: string; name: string } | null)?.id ?? null)
    setActiveSemesterName((sem as { id: string; name: string } | null)?.name ?? null)
    const semId = (sem as { id: string } | null)?.id
    if (!semId) { setRows([]); setLoading(false); return }
    const { data } = await supabase
      .from('mentors')
      .select('id, full_name, company, role_title, linkedin_url, expertise_tags, bio, is_active, slug, email, general_availability, preferred_format, opening_talk')
      .eq('semester_id', semId)
      .order('full_name')
    setRows((data as MentorRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { void (async () => { await load() })() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const allTagSuggestions = useMemo(() =>
    [...new Set(rows.flatMap(r => r.expertise_tags ?? []))].sort()
  , [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => activeFilter === 'all' ? true : activeFilter === 'active' ? r.is_active : !r.is_active)
      .filter(r => {
        if (!q) return true
        return [r.full_name, r.company ?? '', r.email ?? '', ...(r.expertise_tags ?? [])].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const av = String(a[sortKey] ?? '').toLowerCase()
        const bv = String(b[sortKey] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [rows, search, activeFilter, sortKey, sortDir])

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  async function addMentor(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSemesterId) return
    setAmLoading(true); setAmError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setAmError('Not authenticated.'); setAmLoading(false); return }
    const res = await fetch('/api/admin/mentors/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        semesterId: activeSemesterId,
        email: amEmail.trim().toLowerCase(),
        fullName: amName.trim(),
        company: amCompany.trim() || null,
        roleTitle: amRoleTitle.trim() || null,
        linkedinUrl: amLinkedin.trim() || null,
        expertiseTags: amTagsArr,
        bio: amBio.trim() || null,
        isActive: true,
        generalAvailability: amGeneralAvail.trim() || null,
        preferredFormat: amFormat || null,
        openingTalk: amOpeningTalk.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setAmError(json.error ?? 'Something went wrong.')
    } else {
      if (json.magicLink) setMagicLinks(prev => [{ label: amName.trim(), link: json.magicLink }, ...prev].slice(0, 5))
      setAmName(''); setAmEmail(''); setAmCompany(''); setAmRoleTitle(''); setAmLinkedin('')
      setAmBio(''); setAmTagsArr([]); setAmGeneralAvail(''); setAmFormat(''); setAmOpeningTalk('')
      setShowAdd(false)
      await load()
    }
    setAmLoading(false)
  }

  function openEdit(m: MentorRow) {
    setEditingId(m.id)
    setDraft({ full_name: m.full_name, company: m.company, role_title: m.role_title, linkedin_url: m.linkedin_url, bio: m.bio, expertise_tags: m.expertise_tags, email: m.email, general_availability: m.general_availability, preferred_format: m.preferred_format, opening_talk: m.opening_talk })
  }

  async function saveMentor(id: string) {
    setSavingId(id)
    await supabase.from('mentors').update({
      full_name: draft.full_name?.trim(),
      company: draft.company?.trim() || null,
      role_title: draft.role_title?.trim() || null,
      linkedin_url: draft.linkedin_url?.trim() || null,
      bio: draft.bio?.trim() || null,
      expertise_tags: draft.expertise_tags ?? [],
      email: draft.email?.trim() || null,
      general_availability: draft.general_availability?.trim() || null,
      preferred_format: draft.preferred_format || null,
      opening_talk: draft.opening_talk?.trim() || null,
    } as never).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...draft as MentorRow } : r))
    setEditingId(null)
    setSavingId(null)
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id)
    await supabase.from('mentors').update({ is_active: !current } as never).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, is_active: !current } : r))
    setTogglingId(null)
  }

  return (
    <div className="max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#002147]">Mentors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage mentors for{' '}
            <span className="font-medium text-gray-700">{activeSemesterName ?? '—'}</span>
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setAmError(null) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add mentor
        </button>
      </div>

      {/* Magic links */}
      {magicLinks.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Recent magic links</p>
          {magicLinks.map((m, i) => (
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
        <form onSubmit={addMentor} className="bg-white border border-gray-200 rounded-xl p-5 mb-5 space-y-4">
          <p className="text-sm font-semibold text-[#002147]">New mentor</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-red-400">*</span></label>
              <input required value={amName} onChange={e => setAmName(e.target.value)} placeholder="Jane Smith"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-400">*</span></label>
              <input required type="email" value={amEmail} onChange={e => setAmEmail(e.target.value)} placeholder="jane@example.com"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
              <input value={amCompany} onChange={e => setAmCompany(e.target.value)} placeholder="Acme Inc."
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role title</label>
              <input value={amRoleTitle} onChange={e => setAmRoleTitle(e.target.value)} placeholder="Partner, VP…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
              <input value={amLinkedin} onChange={e => setAmLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred format</label>
              <select value={amFormat} onChange={e => setAmFormat(e.target.value)}
                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                <option value="">—</option>
                <option value="online">Online</option>
                <option value="in-person">In-person</option>
                <option value="no-preference">No preference</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">General availability</label>
              <input value={amGeneralAvail} onChange={e => setAmGeneralAvail(e.target.value)} placeholder="Generally available / Occasionally…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
              <TagInput value={amTagsArr} onChange={setAmTagsArr} suggestions={allTagSuggestions} placeholder="Search or create tags…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Bio / areas of expertise</label>
              <textarea rows={3} value={amBio} onChange={e => setAmBio(e.target.value)} placeholder="Background, domain expertise…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Opening talk proposal</label>
              <textarea rows={2} value={amOpeningTalk} onChange={e => setAmOpeningTalk(e.target.value)} placeholder="Proposed topic, date availability…"
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
            </div>
          </div>
          {amError && <p className="text-xs text-red-500">{amError}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={amLoading}
              className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors">
              {amLoading ? 'Adding…' : 'Add mentor + magic link'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAmError(null) }}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input type="search" placeholder="Search name, email, company, tags…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${activeFilter === f ? 'bg-white text-[#002147] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 shrink-0">{filtered.length} of {rows.length}</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-[#002147] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 px-1">No mentors match the current filters.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm table-fixed border-collapse">
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {([['full_name', 'Name'], ['company', 'Company'], ['is_active', 'Status']] as const).map(([k, label]) => (
                  <th key={k} className="px-4 py-3 text-left font-normal">
                    <button onClick={() => handleSort(k)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-[#002147] transition-colors">
                      {label}
                      <span className={sortKey === k ? 'text-[#002147]' : 'text-gray-300'}>
                        {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => (
                <Fragment key={m.id}>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      {m.slug ? (
                        <Link href={`/dashboard/admin/mentors/${m.slug}`}
                          className="text-sm font-medium text-[#002147] hover:underline block truncate">
                          {m.full_name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-[#002147] truncate">{m.full_name}</p>
                      )}
                      {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700 truncate">{m.company ?? '—'}</p>
                      {m.role_title && <p className="text-xs text-gray-400 truncate">{m.role_title}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(m.id, m.is_active)} disabled={togglingId === m.id}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${m.is_active ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}>
                        {togglingId === m.id ? '…' : m.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(m.expertise_tags ?? []).slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                        ))}
                        {(m.expertise_tags ?? []).length > 3 && (
                          <span className="text-[10px] text-gray-400">+{m.expertise_tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => editingId === m.id ? setEditingId(null) : openEdit(m)}
                        className="text-xs font-medium text-gray-500 hover:text-[#002147] px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                        {editingId === m.id ? 'Cancel' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {editingId === m.id && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="bg-gray-50/80 border-t border-gray-100 px-5 py-4 space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            {([
                              ['Full name', 'full_name', 'text', 'Jane Smith'],
                              ['Email', 'email', 'email', 'jane@example.com'],
                              ['Company', 'company', 'text', 'Acme Inc.'],
                              ['Role title', 'role_title', 'text', 'Partner, VP…'],
                              ['LinkedIn URL', 'linkedin_url', 'url', 'https://linkedin.com/in/…'],
                              ['General availability', 'general_availability', 'text', 'Generally available…'],
                            ] as const).map(([label, key, type, ph]) => (
                              <div key={key}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                                <input type={type} value={(draft[key] as string) ?? ''} placeholder={ph}
                                  onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
                                  className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                              </div>
                            ))}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Preferred format</label>
                              <select value={draft.preferred_format ?? ''} onChange={e => setDraft(p => ({ ...p, preferred_format: e.target.value }))}
                                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                                <option value="">—</option>
                                <option value="online">Online</option>
                                <option value="in-person">In-person</option>
                                <option value="no-preference">No preference</option>
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
                              <TagInput value={draft.expertise_tags ?? []} onChange={tags => setDraft(p => ({ ...p, expertise_tags: tags }))}
                                suggestions={allTagSuggestions} placeholder="Search or create tags…" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                              <textarea rows={3} value={draft.bio ?? ''} onChange={e => setDraft(p => ({ ...p, bio: e.target.value }))}
                                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Opening talk proposal</label>
                              <textarea rows={2} value={draft.opening_talk ?? ''} onChange={e => setDraft(p => ({ ...p, opening_talk: e.target.value }))}
                                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button onClick={() => saveMentor(m.id)} disabled={savingId === m.id}
                              className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors">
                              {savingId === m.id ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
