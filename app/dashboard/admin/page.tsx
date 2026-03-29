'use client'

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import TagInput from '@/components/TagInput'

type PendingUser = {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

type Member = {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

type Mentor = {
  id: string
  full_name: string
  company: string | null
  role_title: string | null
  linkedin_url: string | null
  bio: string | null
  expertise_tags: string[]
  is_active: boolean
  slug: string | null
  email: string | null
  general_availability: string | null
  preferred_format: string | null
  per_week_availability: Record<string, { slot: string; format: string }> | null
  opening_talk: string | null
}

type Outreach = {
  id: string
  prospect_name: string
  prospect_email: string | null
  company: string | null
  linkedin_url: string | null
  expertise_tags: string[]
  status: string
  notes: string | null
  last_contacted_at: string | null
  converted_mentor_id: string | null
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
  slug: string | null
  description: string | null
  preferred_tags: string[]
}

type Session = {
  id: string
  status: string
  topic: string | null
  time_slot: string | null
  format: string | null
  startup_absent: boolean
  substitute_name: string | null
  is_confirmed: boolean
  session_dates: { date: string; label: string | null } | null
  mentors: { full_name: string; slug: string | null } | null
  startups: { name: string; slug: string | null } | null
}

type SessionDate = {
  id: string
  date: string
  label: string | null
}

type SortDir = 'asc' | 'desc'
type MemberSortKey = 'full_name' | 'email' | 'role' | 'is_active'

type Tab = 'users' | 'members' | 'schedule' | 'startups'

function SessionCard({ s }: { s: Session }) {
  const startupLabel = s.startup_absent
    ? `Sub: ${s.substitute_name ?? 'TBD'}`
    : (s.startups?.name ?? '—')
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
      !s.is_confirmed ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#002147] truncate">
          {s.startup_absent
            ? <span className="italic text-gray-400">{startupLabel}</span>
            : startupLabel
          }
          <span className="text-gray-400 font-normal mx-1.5">↔</span>
          {s.mentors?.full_name ?? '—'}
        </p>
        {s.topic && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.topic}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {s.format && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            s.format === 'in-person' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {s.format === 'in-person' ? 'In-person' : 'Online'}
          </span>
        )}
        {s.startup_absent && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
            Absent
          </span>
        )}
        {!s.is_confirmed && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
            Unconfirmed
          </span>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('users')

  // Pending users
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<string | null>(null)

  // Members
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>('full_name')
  const [memberSortDir, setMemberSortDir] = useState<SortDir>('asc')
  const [memberShowAll, setMemberShowAll] = useState(false)
  const [togglingActive, setTogglingActive] = useState<string | null>(null)

  // Add user form
  const [showAddUser, setShowAddUser] = useState(false)
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'mentor' | 'startup' | 'admin' | ''>('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)

  // Edit user form
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'mentor' | 'startup' | 'admin' | ''>('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Assign / remove / move founders
  const [founderTargetStartup, setFounderTargetStartup] = useState<Record<string, string>>({})
  const [assigningFounder, setAssigningFounder] = useState<string | null>(null)
  const [assignFounderError, setAssignFounderError] = useState<string | null>(null)
  const [founderActionKey, setFounderActionKey] = useState<string | null>(null) // "startupId:email"

  // Create startup form
  const [showCreateStartup, setShowCreateStartup] = useState(false)
  const [csName, setCsName] = useState('')
  const [csSlug, setCsSlug] = useState('')
  const [csIndustry, setCsIndustry] = useState('')
  const [csStage, setCsStage] = useState('')
  const [csDescription, setCsDescription] = useState('')
  const [csTagsArr, setCsTagsArr] = useState<string[]>([])
  const [csLoading, setCsLoading] = useState(false)
  const [csError, setCsError] = useState<string | null>(null)
  const [csSuccess, setCsSuccess] = useState<string | null>(null)

  // Add mentor form
  const [showAddMentor, setShowAddMentor] = useState(false)
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
  const [amSuccess, setAmSuccess] = useState<string | null>(null)

  // Add outreach form
  const [showAddOutreach, setShowAddOutreach] = useState(false)
  const [aoName, setAoName] = useState('')
  const [aoEmail, setAoEmail] = useState('')
  const [aoCompany, setAoCompany] = useState('')
  const [aoLinkedin, setAoLinkedin] = useState('')
  const [aoTagsArr, setAoTagsArr] = useState<string[]>([])
  const [aoNotes, setAoNotes] = useState('')
  const [aoStatus, setAoStatus] = useState('prospect')
  const [aoLoading, setAoLoading] = useState(false)
  const [aoError, setAoError] = useState<string | null>(null)
  const [aoSuccess, setAoSuccess] = useState<string | null>(null)

  // Schedule add session popup
  const [showAddSession, setShowAddSession] = useState(false)

  // Mentors tab
  const [mentorSearch, setMentorSearch] = useState('')
  const [mentorSortKey, setMentorSortKey] = useState<'full_name' | 'company' | 'is_active'>('full_name')
  const [mentorSortDir, setMentorSortDir] = useState<SortDir>('asc')
  const [mentorActiveFilter, setMentorActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingMentorId, setEditingMentorId] = useState<string | null>(null)
  const [mentorDraft, setMentorDraft] = useState<Partial<Mentor>>({})
  const [savingMentorId, setSavingMentorId] = useState<string | null>(null)
  const [togglingMentorActive, setTogglingMentorActive] = useState<string | null>(null)

  // Outreach tab
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [outreachSearch, setOutreachSearch] = useState('')
  const [outreachStatusFilter, setOutreachStatusFilter] = useState<string>('all')
  const [editingOutreachId, setEditingOutreachId] = useState<string | null>(null)
  const [outreachDraft, setOutreachDraft] = useState<Partial<Outreach>>({})
  const [savingOutreachId, setSavingOutreachId] = useState<string | null>(null)

  // Schedule / other tabs
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [startups, setStartups] = useState<Startup[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([])
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null)
  const [selectedSessionDateId, setSelectedSessionDateId] = useState<string | null>(null)
  const [assignMentorId, setAssignMentorId] = useState<string>('')
  const [assignStartupId, setAssignStartupId] = useState<string>('')
  const [assignTopic, setAssignTopic] = useState<string>('')
  const [assignTimeSlot, setAssignTimeSlot] = useState<string>('3:30-4:15')
  const [assignFormat, setAssignFormat] = useState<string>('online')
  const [assignStartupAbsent, setAssignStartupAbsent] = useState<boolean>(false)
  const [assignSubstituteName, setAssignSubstituteName] = useState<string>('')
  const [assigning, setAssigning] = useState<boolean>(false)

  async function loadAll() {
    const [usersRes, membersRes, mentorsRes, startupsRes, sessionsRes, semesterRes, outreachRes] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, created_at').eq('status', 'pending').order('created_at'),
      supabase.from('profiles').select('id, email, full_name, role, is_active, created_at').eq('status', 'approved').order('full_name'),
      supabase.from('mentors').select('id, full_name, company, role_title, linkedin_url, bio, expertise_tags, is_active, slug, email, general_availability, preferred_format, per_week_availability, opening_talk').order('full_name'),
      supabase.from('startups').select('id, name, industry, stage, founder_name, founders, slug, description, preferred_tags').order('name'),
      supabase.from('sessions').select('id, status, topic, time_slot, format, startup_absent, substitute_name, is_confirmed, session_dates(date, label), mentors(full_name, slug), startups(name, slug)').order('time_slot'),
      supabase.from('semesters').select('id').eq('is_active', true).maybeSingle(),
      supabase.from('outreach').select('id, prospect_name, prospect_email, company, linkedin_url, expertise_tags, status, notes, last_contacted_at, converted_mentor_id').order('prospect_name'),
    ])
    setPendingUsers((usersRes.data as PendingUser[]) ?? [])
    setMembers((membersRes.data as Member[]) ?? [])
    setMentors((mentorsRes.data as Mentor[]) ?? [])
    setStartups((startupsRes.data as Startup[]) ?? [])
    setSessions((sessionsRes.data as Session[]) ?? [])
    setOutreach((outreachRes.data as Outreach[]) ?? [])

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

  // ── Pending users ──────────────────────────────────────────────────────────

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

  // ── Members ───────────────────────────────────────────────────────────────

  async function toggleMemberActive(memberId: string, current: boolean) {
    setTogglingActive(memberId)
    await supabase.from('profiles').update({ is_active: !current }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_active: !current } : m))
    setTogglingActive(null)
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault()
    if (!addRole) return
    setAddLoading(true)
    setAddError(null)
    setAddSuccess(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setAddError('Not authenticated.')
      setAddLoading(false)
      return
    }

    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email: addEmail, fullName: addName, role: addRole }),
    })
    const json = await res.json()

    if (!res.ok) {
      setAddError(json.error ?? 'Something went wrong.')
    } else {
      setAddSuccess(`Invite sent to ${addEmail}. They can sign in once they click the link.`)
      setAddName('')
      setAddEmail('')
      setAddRole('')
      // Refresh members list
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at')
        .eq('status', 'approved')
        .order('full_name')
      setMembers((data as Member[]) ?? [])
    }
    setAddLoading(false)
  }

  function openEdit(m: Member) {
    setEditingMember(m)
    setEditName(m.full_name ?? '')
    setEditEmail(m.email)
    setEditRole(m.role as 'mentor' | 'startup' | 'admin')
    setEditError(null)
    setShowAddUser(false)
    setAddSuccess(null)
  }

  function cancelEdit() {
    setEditingMember(null)
    setEditError(null)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember || !editRole) return
    setEditLoading(true)
    setEditError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setEditError('Not authenticated.')
      setEditLoading(false)
      return
    }

    const res = await fetch('/api/admin/users/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: editingMember.id,
        fullName: editName,
        email: editEmail,
        role: editRole,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setEditError(json.error ?? 'Something went wrong.')
    } else {
      setMembers(prev =>
        prev.map(m =>
          m.id === editingMember.id
            ? { ...m, full_name: editName, email: editEmail, role: editRole }
            : m,
        ),
      )
      setEditingMember(null)
    }
    setEditLoading(false)
  }

  async function createStartup(e: React.FormEvent) {
    e.preventDefault()
    setCsLoading(true)
    setCsError(null)
    setCsSuccess(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setCsError('Not authenticated.'); setCsLoading(false); return }

    const slug = csName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const tags = csTagsArr

    const res = await fetch('/api/admin/startups/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: csName.trim(),
        slug: csSlug.trim() || slug,
        industry: csIndustry.trim(),
        stage: csStage,
        description: csDescription.trim(),
        tags,
        semesterId: activeSemesterId,
      }),
    })
    const json = await res.json()

    if (!res.ok) {
      setCsError(json.error ?? 'Something went wrong.')
    } else {
      setCsSuccess(`Startup "${csName.trim()}" created.`)
      setCsName(''); setCsSlug(''); setCsIndustry(''); setCsStage(''); setCsDescription(''); setCsTagsArr([])
      const { data } = await supabase.from('startups').select('id, name, industry, stage, founder_name, founders, slug, description, preferred_tags').order('name')
      setStartups((data as Startup[]) ?? [])
    }
    setCsLoading(false)
  }

  async function assignFounder(userId: string) {
    const startupId = founderTargetStartup[userId]
    if (!startupId) return
    setAssigningFounder(userId)
    setAssignFounderError(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setAssignFounderError('Not authenticated.'); setAssigningFounder(null); return }

    const res = await fetch('/api/admin/startups/assign-founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, startupId }),
    })
    const json = await res.json()

    if (!res.ok) {
      setAssignFounderError(json.error ?? 'Something went wrong.')
    } else {
      await refreshStartups()
      setFounderTargetStartup(prev => { const next = { ...prev }; delete next[userId]; return next })
    }
    setAssigningFounder(null)
  }

  async function refreshStartups() {
    const { data } = await supabase
      .from('startups')
      .select('id, name, industry, stage, founder_name, founders, slug, description, preferred_tags')
      .order('name')
    setStartups((data as Startup[]) ?? [])
  }

  async function removeFounder(email: string, startupId: string) {
    const key = `${startupId}:${email}`
    setFounderActionKey(key)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setFounderActionKey(null); return }

    await fetch('/api/admin/startups/remove-founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ startupId, email }),
    })
    await refreshStartups()
    setFounderActionKey(null)
  }

  async function moveFounder(email: string, fromStartupId: string, toStartupId: string) {
    if (!toStartupId) return
    const key = `${fromStartupId}:${email}`
    setFounderActionKey(key)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setFounderActionKey(null); return }

    await fetch('/api/admin/startups/move-founder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, fromStartupId, toStartupId }),
    })
    await refreshStartups()
    setFounderActionKey(null)
  }

  // ── Mentors ─────────────────────────────────────────────────────────────────

  function openEditMentor(m: Mentor) {
    setEditingMentorId(m.id)
    setMentorDraft({
      full_name: m.full_name,
      company: m.company,
      role_title: m.role_title,
      linkedin_url: m.linkedin_url,
      bio: m.bio,
      expertise_tags: m.expertise_tags,
      email: m.email,
      general_availability: m.general_availability,
      preferred_format: m.preferred_format,
      opening_talk: m.opening_talk,
    })
  }

  async function saveMentor(mentorId: string) {
    if (!mentorDraft.full_name?.trim()) return
    setSavingMentorId(mentorId)
    const { error } = await supabase
      .from('mentors')
      .update({
        full_name: mentorDraft.full_name.trim(),
        company: mentorDraft.company?.trim() || null,
        role_title: mentorDraft.role_title?.trim() || null,
        linkedin_url: mentorDraft.linkedin_url?.trim() || null,
        bio: mentorDraft.bio?.trim() || null,
        expertise_tags: mentorDraft.expertise_tags ?? [],
        email: mentorDraft.email?.trim() || null,
        general_availability: mentorDraft.general_availability?.trim() || null,
        preferred_format: mentorDraft.preferred_format?.trim() || null,
        opening_talk: mentorDraft.opening_talk?.trim() || null,
      } as never)
      .eq('id', mentorId)
    if (!error) {
      setMentors(prev => prev.map(m => m.id === mentorId ? { ...m, ...mentorDraft as Mentor } : m))
      setEditingMentorId(null)
    }
    setSavingMentorId(null)
  }

  async function toggleMentorActive(mentorId: string, current: boolean) {
    setTogglingMentorActive(mentorId)
    await supabase.from('mentors').update({ is_active: !current } as never).eq('id', mentorId)
    setMentors(prev => prev.map(m => m.id === mentorId ? { ...m, is_active: !current } : m))
    setTogglingMentorActive(null)
  }

  async function addMentor(e: React.FormEvent) {
    e.preventDefault()
    if (!amName.trim() || !amEmail.trim()) return
    setAmLoading(true)
    setAmError(null)
    setAmSuccess(null)
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
      setAmSuccess(`${amName.trim()} added as mentor.`)
      setAmName(''); setAmEmail(''); setAmCompany(''); setAmRoleTitle(''); setAmLinkedin('')
      setAmBio(''); setAmTagsArr([]); setAmGeneralAvail(''); setAmFormat(''); setAmOpeningTalk('')
      const { data } = await supabase.from('mentors').select('id, full_name, company, role_title, linkedin_url, bio, expertise_tags, is_active, slug, email, general_availability, preferred_format, per_week_availability, opening_talk').order('full_name')
      setMentors((data as Mentor[]) ?? [])
    }
    setAmLoading(false)
  }

  async function addOutreach(e: React.FormEvent) {
    e.preventDefault()
    if (!aoName.trim()) return
    setAoLoading(true)
    setAoError(null)
    setAoSuccess(null)
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const userId = authSession?.user?.id
    if (!userId || !activeSemesterId) { setAoError('Not authenticated or no active semester.'); setAoLoading(false); return }
    const { data, error } = await supabase.from('outreach').insert({
      admin_id: userId,
      semester_id: activeSemesterId,
      prospect_name: aoName.trim(),
      prospect_email: aoEmail.trim() || null,
      company: aoCompany.trim() || null,
      linkedin_url: aoLinkedin.trim() || null,
      expertise_tags: aoTagsArr,
      status: aoStatus,
      notes: aoNotes.trim() || null,
    } as never).select('id, prospect_name, prospect_email, company, linkedin_url, expertise_tags, status, notes, last_contacted_at, converted_mentor_id').single()
    if (error) {
      setAoError(error.message)
    } else {
      setAoSuccess(`${aoName.trim()} added to outreach.`)
      setAoName(''); setAoEmail(''); setAoCompany(''); setAoLinkedin(''); setAoTagsArr([]); setAoNotes(''); setAoStatus('prospect')
      setOutreach(prev => [data as Outreach, ...prev])
    }
    setAoLoading(false)
  }

  function handleMentorSort(key: 'full_name' | 'company' | 'is_active') {
    if (mentorSortKey === key) {
      setMentorSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setMentorSortKey(key)
      setMentorSortDir('asc')
    }
  }

  const filteredMentors = mentors
    .filter(m => mentorActiveFilter === 'all' ? true : mentorActiveFilter === 'active' ? m.is_active : !m.is_active)
    .filter(m => {
      if (!mentorSearch.trim()) return true
      const q = mentorSearch.toLowerCase()
      return (
        m.full_name.toLowerCase().includes(q) ||
        (m.company ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        (m.expertise_tags ?? []).some(t => t.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      const aVal = String(a[mentorSortKey] ?? '').toLowerCase()
      const bVal = String(b[mentorSortKey] ?? '').toLowerCase()
      return mentorSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

  // ── Outreach ─────────────────────────────────────────────────────────────────

  function openEditOutreach(o: Outreach) {
    setEditingOutreachId(o.id)
    setOutreachDraft({ status: o.status, notes: o.notes, last_contacted_at: o.last_contacted_at })
  }

  async function saveOutreach(outreachId: string) {
    setSavingOutreachId(outreachId)
    const { error } = await supabase
      .from('outreach')
      .update({
        status: outreachDraft.status,
        notes: outreachDraft.notes?.trim() || null,
        last_contacted_at: outreachDraft.last_contacted_at || null,
      } as never)
      .eq('id', outreachId)
    if (!error) {
      setOutreach(prev => prev.map(o => o.id === outreachId ? { ...o, ...outreachDraft as Outreach } : o))
      setEditingOutreachId(null)
    }
    setSavingOutreachId(null)
  }

  const filteredOutreach = outreach
    .filter(o => outreachStatusFilter === 'all' || o.status === outreachStatusFilter)
    .filter(o => {
      if (!outreachSearch.trim()) return true
      const q = outreachSearch.toLowerCase()
      return (
        o.prospect_name.toLowerCase().includes(q) ||
        (o.prospect_email ?? '').toLowerCase().includes(q) ||
        (o.company ?? '').toLowerCase().includes(q)
      )
    })

  // ── Startup-role members not yet linked to any startup (email not in any founders array)
  const allTags = [...new Set(startups.flatMap(s => s.preferred_tags ?? []))].sort()

  const linkedFounderEmails = new Set(
    startups.flatMap(s => (s.founders ?? []).map(f => f.email).filter((e): e is string => Boolean(e)))
  )
  const pendingStartupUsers = members.filter(
    m => m.role === 'startup' && !linkedFounderEmails.has(m.email)
  )

  function handleMemberSort(key: MemberSortKey) {
    if (memberSortKey === key) {
      setMemberSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setMemberSortKey(key)
      setMemberSortDir('asc')
    }
  }

  const filteredMembers = members
    .filter(m => memberShowAll || m.is_active)
    .filter(m => {
      if (!memberSearch.trim()) return true
      const q = memberSearch.toLowerCase()
      return (
        (m.full_name ?? '').toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const aVal = String(a[memberSortKey] ?? '').toLowerCase()
      const bVal = String(b[memberSortKey] ?? '').toLowerCase()
      return memberSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

  // ── Schedule ───────────────────────────────────────────────────────────────

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
    if (!assignMentorId) {
      alert('Pick a mentor.')
      return
    }
    if (!assignStartupAbsent && !assignStartupId) {
      alert('Pick a startup, or mark the startup as absent and enter a substitute name.')
      return
    }
    setAssigning(true)
    try {
      const { error } = await supabase.from('sessions').insert({
        mentor_id: assignMentorId,
        startup_id: assignStartupAbsent ? null : assignStartupId,
        session_date_id: selectedSessionDateId,
        semester_id: activeSemesterId,
        time_slot: assignTimeSlot,
        format: assignFormat,
        startup_absent: assignStartupAbsent,
        substitute_name: assignStartupAbsent && assignSubstituteName.trim() ? assignSubstituteName.trim() : null,
        topic: assignTopic.trim() ? assignTopic.trim() : null,
        status: 'confirmed',
        is_confirmed: true,
      } as never)
      if (error) throw error

      const { data: sessionRows } = await supabase
        .from('sessions')
        .select('id, status, topic, time_slot, format, startup_absent, substitute_name, is_confirmed, session_dates(date, label), mentors(full_name, slug), startups(name, slug)')
        .order('time_slot')
      setSessions((sessionRows as Session[]) ?? [])
      setAssignTopic('')
      setAssignSubstituteName('')
      setAssignStartupAbsent(false)
      setAssignStartupId('')
      setAssignMentorId('')
      setShowAddSession(false)
    } catch (e) {
      console.error(e)
      alert(`Assignment failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAssigning(false)
    }
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'users', label: 'Pending Users', badge: pendingUsers.length },
    { id: 'members', label: 'Members' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'startups', label: 'Startups' },
  ]

  function SortIcon({ field }: { field: MemberSortKey }) {
    if (memberSortKey !== field) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-[#002147] ml-1">{memberSortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-50 text-purple-700',
    mentor: 'bg-blue-50 text-blue-700',
    startup: 'bg-green-50 text-green-700',
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#002147]">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, review schedules, and oversee the program.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
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

      {/* ── Pending Users ── */}
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

      {/* ── Members ── */}
      {tab === 'members' && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Approved platform members. Deactivate to block login.
            </p>
            <button
              onClick={() => { setShowAddUser(v => !v); setAddError(null); setAddSuccess(null) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add user
            </button>
          </div>

          {/* Add user form */}
          {showAddUser && (
            <form
              onSubmit={addUser}
              className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4"
            >
              <p className="text-sm font-semibold text-[#002147]">Add new user</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Smith"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select
                    required
                    value={addRole}
                    onChange={e => setAddRole(e.target.value as typeof addRole)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  >
                    <option value="">Select role…</option>
                    <option value="mentor">Mentor</option>
                    <option value="startup">Startup</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {addError && <p className="text-xs text-red-500">{addError}</p>}
              {addSuccess && <p className="text-xs text-green-600">{addSuccess}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors"
                >
                  {addLoading ? 'Sending invite…' : 'Send invite'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddUser(false); setAddError(null); setAddSuccess(null) }}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Edit user form */}
          {editingMember && (
            <form
              onSubmit={saveEdit}
              className="bg-white border border-[#75AADB]/40 rounded-xl p-5 mb-4 space-y-4"
            >
              <p className="text-sm font-semibold text-[#002147]">
                Editing <span className="font-normal text-gray-500">{editingMember.email}</span>
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <select
                    required
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as typeof editRole)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                  >
                    <option value="mentor">Mentor</option>
                    <option value="startup">Startup</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {editError && <p className="text-xs text-red-500">{editError}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors"
                >
                  {editLoading ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500">{filteredMembers.length} user{filteredMembers.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setMemberShowAll(v => !v)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  memberShowAll
                    ? 'bg-[#002147] text-white border-[#002147]'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {memberShowAll ? 'Showing all' : 'Active only'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-gray-400 p-6">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-[#002147] whitespace-nowrap"
                        onClick={() => handleMemberSort('full_name')}
                      >
                        Name <SortIcon field="full_name" />
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-[#002147] whitespace-nowrap"
                        onClick={() => handleMemberSort('email')}
                      >
                        Email <SortIcon field="email" />
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-[#002147] whitespace-nowrap"
                        onClick={() => handleMemberSort('role')}
                      >
                        Role <SortIcon field="role" />
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-[#002147] whitespace-nowrap"
                        onClick={() => handleMemberSort('is_active')}
                      >
                        Status <SortIcon field="is_active" />
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[#002147] whitespace-nowrap">
                          {m.full_name ?? <span className="text-gray-400 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{m.email}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${roleColors[m.role] ?? 'bg-gray-100 text-gray-600'}`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            m.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                            {m.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(m)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                                editingMember?.id === m.id
                                  ? 'bg-[#002147] text-white border-[#002147]'
                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleMemberActive(m.id, m.is_active)}
                              disabled={togglingActive === m.id}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${
                                m.is_active
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-green-200 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {togglingActive === m.id ? '…' : m.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Schedule ── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <select
                value={selectedSessionDateId ?? ''}
                onChange={e => setSelectedSessionDateId(e.target.value)}
                className="text-sm text-gray-800 border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
              >
                <option value="">Select week…</option>
                {sessionDates.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.label ?? d.date} · {d.date}
                  </option>
                ))}
              </select>
              {selectedDate && (
                <span className="text-sm text-gray-500">
                  {sessionsForSelectedDate.length} session{sessionsForSelectedDate.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              onClick={() => { setShowAddSession(v => !v) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add session
            </button>
          </div>

          {/* Add session form */}
          {showAddSession && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <p className="text-sm font-semibold text-[#002147]">New session</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time slot</label>
                  <select value={assignTimeSlot} onChange={e => setAssignTimeSlot(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                    <option value="3:30-4:15">3:30 – 4:15 PM</option>
                    <option value="4:15-5:00">4:15 – 5:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Format</label>
                  <select value={assignFormat} onChange={e => setAssignFormat(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                    <option value="online">Online</option>
                    <option value="in-person">In-person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mentor <span className="text-red-400">*</span></label>
                  <select value={assignMentorId} onChange={e => setAssignMentorId(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                    <option value="">Select mentor…</option>
                    {mentors.filter(m => m.is_active).map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}{m.company ? ` · ${m.company}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Startup</label>
                  <select value={assignStartupId} onChange={e => setAssignStartupId(e.target.value)}
                    disabled={assignStartupAbsent}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 disabled:opacity-40">
                    <option value="">Select startup…</option>
                    {startups.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
                  <input value={assignTopic} onChange={e => setAssignTopic(e.target.value)}
                    placeholder="Optional"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none mt-5">
                    <input type="checkbox" checked={assignStartupAbsent}
                      onChange={e => { setAssignStartupAbsent(e.target.checked); if (!e.target.checked) setAssignSubstituteName('') }}
                      className="w-4 h-4 rounded accent-[#002147]" />
                    <span className="text-sm text-gray-700">Startup absent</span>
                  </label>
                  {assignStartupAbsent && (
                    <input value={assignSubstituteName} onChange={e => setAssignSubstituteName(e.target.value)}
                      placeholder="Substitute name…"
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={assignForWeek} disabled={assigning || !assignMentorId}
                  className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors">
                  {assigning ? 'Adding…' : 'Add session'}
                </button>
                <button onClick={() => setShowAddSession(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {selectedDate && (() => {
            const slot1 = sessionsForSelectedDate.filter(s => s.time_slot === '3:30-4:15')
            const slot2 = sessionsForSelectedDate.filter(s => s.time_slot === '4:15-5:00')
            const unslotted = sessionsForSelectedDate.filter(s => !s.time_slot)

            return (
              <div className="space-y-3">
                {(['3:30-4:15', '4:15-5:00'] as const).map(slot => {
                  const slotSessions = slot === '3:30-4:15' ? slot1 : slot2
                  return (
                    <div key={slot} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                        <p className="text-xs font-semibold text-[#002147] uppercase tracking-wide">
                          {slot === '3:30-4:15' ? '3:30 – 4:15 PM' : '4:15 – 5:00 PM'}
                        </p>
                        <span className="text-xs text-gray-400">{slotSessions.length} session{slotSessions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="p-3 space-y-2">
                        {slotSessions.length > 0
                          ? slotSessions.map(s => <SessionCard key={s.id} s={s} />)
                          : <p className="text-xs text-gray-400 px-1 py-1">No sessions scheduled.</p>
                        }
                      </div>
                    </div>
                  )
                })}

                {unslotted.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time TBD</p>
                    </div>
                    <div className="p-3 space-y-2">
                      {unslotted.map(s => <SessionCard key={s.id} s={s} />)}
                    </div>
                  </div>
                )}

              </div>
            )
          })()}

          {!selectedDate && sessionDates.length === 0 && (
            <p className="text-sm text-gray-400">No session dates found for the active semester.</p>
          )}
        </div>
      )}

      {/* ── Mentors ── */}
      {tab === 'mentors' && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">
                {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} registered.
              </p>
            </div>
            <button
              onClick={() => { setShowAddMentor(v => !v); setAmError(null); setAmSuccess(null) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add mentor
            </button>
          </div>

          {/* Add mentor form */}
          {showAddMentor && (
            <form onSubmit={addMentor} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
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
                  <input value={amGeneralAvail} onChange={e => setAmGeneralAvail(e.target.value)} placeholder="Generally available, Occasionally…"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
                  <TagInput value={amTagsArr} onChange={setAmTagsArr}
                    suggestions={[...new Set(mentors.flatMap(m => m.expertise_tags ?? []))].sort()}
                    placeholder="Search or create tags…" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bio / areas of expertise</label>
                  <textarea rows={3} value={amBio} onChange={e => setAmBio(e.target.value)} placeholder="Background, expertise…"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Opening talk proposal</label>
                  <textarea rows={2} value={amOpeningTalk} onChange={e => setAmOpeningTalk(e.target.value)} placeholder="Topic, date availability…"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                </div>
              </div>
              {amError && <p className="text-xs text-red-500">{amError}</p>}
              {amSuccess && <p className="text-xs text-green-600">{amSuccess}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={amLoading}
                  className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors">
                  {amLoading ? 'Adding…' : 'Add mentor'}
                </button>
                <button type="button" onClick={() => { setShowAddMentor(false); setAmError(null); setAmSuccess(null) }}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <input
              type="search"
              placeholder="Search mentors…"
              value={mentorSearch}
              onChange={e => setMentorSearch(e.target.value)}
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
            />
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
              {(['all', 'active', 'inactive'] as const).map(f => (
                <button key={f} onClick={() => setMentorActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${mentorActiveFilter === f ? 'bg-white text-[#002147] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 shrink-0">{filteredMentors.length} of {mentors.length}</p>
          </div>

          {filteredMentors.length === 0 ? (
            <p className="text-sm text-gray-400">No mentors match the current filters.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-px bg-gray-100 border-b border-gray-100">
                {([
                  ['full_name', 'Name'],
                  ['company', 'Company'],
                  ['is_active', 'Status'],
                ] as const).map(([key, label]) => (
                  <button key={key} onClick={() => handleMentorSort(key)}
                    className="bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 hover:bg-gray-100 transition-colors">
                    {label}
                    <span className={`${mentorSortKey === key ? 'text-[#002147]' : 'text-gray-300'}`}>
                      {mentorSortKey === key ? (mentorSortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                ))}
                <div className="bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</div>
                <div className="bg-gray-50 px-4 py-3" />
              </div>

              <div className="divide-y divide-gray-50">
                {filteredMentors.map(m => (
                  <div key={m.id}>
                    {/* Row */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-px bg-gray-100 items-center">
                      <div className="bg-white px-4 py-3">
                        {m.slug ? (
                          <Link href={`/dashboard/admin/mentors/${m.slug}`}
                            className="text-sm font-medium text-[#002147] hover:underline block truncate">
                            {m.full_name}
                          </Link>
                        ) : (
                          <p className="text-sm font-medium text-[#002147] truncate">{m.full_name}</p>
                        )}
                        {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                      </div>
                      <div className="bg-white px-4 py-3">
                        <p className="text-sm text-gray-700 truncate">{m.company ?? '—'}</p>
                        {m.role_title && <p className="text-xs text-gray-400 truncate">{m.role_title}</p>}
                      </div>
                      <div className="bg-white px-4 py-3">
                        <button
                          onClick={() => toggleMentorActive(m.id, m.is_active)}
                          disabled={togglingMentorActive === m.id}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                            m.is_active ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {togglingMentorActive === m.id ? '…' : m.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <div className="bg-white px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(m.expertise_tags ?? []).slice(0, 3).map(t => (
                            <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                          ))}
                          {(m.expertise_tags ?? []).length > 3 && (
                            <span className="text-[10px] text-gray-400">+{m.expertise_tags.length - 3}</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white px-4 py-3 flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => editingMentorId === m.id ? setEditingMentorId(null) : openEditMentor(m)}
                          className="text-xs font-medium text-gray-500 hover:text-[#002147] px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          {editingMentorId === m.id ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                    </div>

                    {/* Inline edit form */}
                    {editingMentorId === m.id && (
                      <div className="bg-gray-50/80 border-t border-gray-100 px-5 py-4 space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                            <input value={mentorDraft.full_name ?? ''} onChange={e => setMentorDraft(p => ({ ...p, full_name: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <input value={mentorDraft.email ?? ''} onChange={e => setMentorDraft(p => ({ ...p, email: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                            <input value={mentorDraft.company ?? ''} onChange={e => setMentorDraft(p => ({ ...p, company: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Role title</label>
                            <input value={mentorDraft.role_title ?? ''} onChange={e => setMentorDraft(p => ({ ...p, role_title: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">LinkedIn URL</label>
                            <input value={mentorDraft.linkedin_url ?? ''} onChange={e => setMentorDraft(p => ({ ...p, linkedin_url: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">General availability</label>
                            <input value={mentorDraft.general_availability ?? ''} onChange={e => setMentorDraft(p => ({ ...p, general_availability: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Preferred format</label>
                            <select value={mentorDraft.preferred_format ?? ''} onChange={e => setMentorDraft(p => ({ ...p, preferred_format: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                              <option value="">—</option>
                              <option value="online">Online</option>
                              <option value="in-person">In-person</option>
                              <option value="no-preference">No preference</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Bio / Areas of expertise</label>
                          <textarea rows={3} value={mentorDraft.bio ?? ''} onChange={e => setMentorDraft(p => ({ ...p, bio: e.target.value }))}
                            className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Opening talk proposal</label>
                          <textarea rows={2} value={mentorDraft.opening_talk ?? ''} onChange={e => setMentorDraft(p => ({ ...p, opening_talk: e.target.value }))}
                            className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button onClick={() => saveMentor(m.id)} disabled={savingMentorId === m.id}
                            className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors">
                            {savingMentorId === m.id ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingMentorId(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Outreach ── */}
      {tab === 'outreach' && (
        <div>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {outreach.length} prospect{outreach.length !== 1 ? 's' : ''} tracked.
            </p>
            <button
              onClick={() => { setShowAddOutreach(v => !v); setAoError(null); setAoSuccess(null) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add prospect
            </button>
          </div>

          {/* Add outreach form */}
          {showAddOutreach && (
            <form onSubmit={addOutreach} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
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
                  <select value={aoStatus} onChange={e => setAoStatus(e.target.value)}
                    className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                    <option value="prospect">Prospect</option>
                    <option value="contacted">Contacted</option>
                    <option value="responded">Responded</option>
                    <option value="onboarded">Onboarded</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expertise tags</label>
                  <TagInput value={aoTagsArr} onChange={setAoTagsArr}
                    suggestions={[...new Set(outreach.flatMap(o => o.expertise_tags ?? []))].sort()}
                    placeholder="Search or create tags…" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea rows={2} value={aoNotes} onChange={e => setAoNotes(e.target.value)} placeholder="Any notes…"
                    className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                </div>
              </div>
              {aoError && <p className="text-xs text-red-500">{aoError}</p>}
              {aoSuccess && <p className="text-xs text-green-600">{aoSuccess}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={aoLoading}
                  className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors">
                  {aoLoading ? 'Adding…' : 'Add prospect'}
                </button>
                <button type="button" onClick={() => { setShowAddOutreach(false); setAoError(null); setAoSuccess(null) }}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <input
              type="search"
              placeholder="Search prospects…"
              value={outreachSearch}
              onChange={e => setOutreachSearch(e.target.value)}
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
            />
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0 flex-wrap">
              {(['all', 'prospect', 'contacted', 'responded', 'onboarded'] as const).map(s => (
                <button key={s} onClick={() => setOutreachStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${outreachStatusFilter === s ? 'bg-white text-[#002147] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 shrink-0">{filteredOutreach.length} of {outreach.length}</p>
          </div>

          {filteredOutreach.length === 0 ? (
            <p className="text-sm text-gray-400">No outreach records match the current filters.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filteredOutreach.map(o => {
                  const statusColors: Record<string, string> = {
                    prospect: 'bg-gray-100 text-gray-500',
                    contacted: 'bg-blue-50 text-blue-600',
                    responded: 'bg-amber-50 text-amber-600',
                    onboarded: 'bg-green-50 text-green-600',
                  }
                  return (
                    <div key={o.id}>
                      {/* Row */}
                      <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60">
                        <div className="flex-1 min-w-0 grid sm:grid-cols-3 gap-x-4 gap-y-1">
                          <div>
                            <p className="text-sm font-medium text-[#002147]">{o.prospect_name}</p>
                            {o.prospect_email && <p className="text-xs text-gray-500 truncate">{o.prospect_email}</p>}
                            {o.company && <p className="text-xs text-gray-400">{o.company}</p>}
                          </div>
                          <div className="flex flex-wrap gap-1 content-start">
                            {(o.expertise_tags ?? []).map(t => (
                              <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                            ))}
                          </div>
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[o.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {o.status}
                            </span>
                            {o.last_contacted_at && (
                              <span className="text-xs text-gray-400">
                                Last contact: {new Date(o.last_contacted_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => editingOutreachId === o.id ? setEditingOutreachId(null) : openEditOutreach(o)}
                          className="text-xs font-medium text-gray-500 hover:text-[#002147] px-2 py-1 rounded hover:bg-gray-100 transition-colors shrink-0"
                        >
                          {editingOutreachId === o.id ? 'Cancel' : 'Edit'}
                        </button>
                      </div>

                      {/* Inline edit */}
                      {editingOutreachId === o.id && (
                        <div className="bg-gray-50/80 border-t border-gray-100 px-5 py-4 space-y-3">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                              <select value={outreachDraft.status ?? o.status} onChange={e => setOutreachDraft(p => ({ ...p, status: e.target.value }))}
                                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40">
                                <option value="prospect">Prospect</option>
                                <option value="contacted">Contacted</option>
                                <option value="responded">Responded</option>
                                <option value="onboarded">Onboarded</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Last contacted</label>
                              <input type="date" value={outreachDraft.last_contacted_at?.slice(0, 10) ?? ''}
                                onChange={e => setOutreachDraft(p => ({ ...p, last_contacted_at: e.target.value || null }))}
                                className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                            <textarea rows={2} value={outreachDraft.notes ?? ''}
                              onChange={e => setOutreachDraft(p => ({ ...p, notes: e.target.value }))}
                              className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none" />
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button onClick={() => saveOutreach(o.id)} disabled={savingOutreachId === o.id}
                              className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors">
                              {savingOutreachId === o.id ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => setEditingOutreachId(null)}
                              className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Startups ── */}
      {tab === 'startups' && (
        <div className="space-y-6">

          {/* Pending startup users */}
          {pendingStartupUsers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-[#002147]">Unassigned Startup Members</h2>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {pendingStartupUsers.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">These users have the startup role but are not yet linked to any startup.</p>
              {assignFounderError && (
                <p className="text-xs text-red-500 mb-2">{assignFounderError}</p>
              )}
              <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-amber-50/60">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to startup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingStartupUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 font-medium text-[#002147] whitespace-nowrap">
                          {u.full_name ?? <span className="text-gray-400 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{u.email}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={founderTargetStartup[u.id] ?? ''}
                              onChange={e => setFounderTargetStartup(prev => ({ ...prev, [u.id]: e.target.value }))}
                              className="text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                            >
                              <option value="">Select startup…</option>
                              {startups.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => assignFounder(u.id)}
                              disabled={!founderTargetStartup[u.id] || assigningFounder === u.id}
                              className="px-3 py-1.5 bg-[#002147] text-white text-xs font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
                            >
                              {assigningFounder === u.id ? '…' : 'Assign'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Startups list header + create button */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#002147]">Startups</h2>
                <p className="text-xs text-gray-500 mt-0.5">{startups.length} startup{startups.length !== 1 ? 's' : ''} registered.</p>
              </div>
              <button
                onClick={() => { setShowCreateStartup(v => !v); setCsError(null); setCsSuccess(null) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-xl hover:bg-[#002147]/90 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create startup
              </button>
            </div>

            {/* Create startup form */}
            {showCreateStartup && (
              <form onSubmit={createStartup} className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
                <p className="text-sm font-semibold text-[#002147]">New startup</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
                    <input
                      type="text" required placeholder="Acme Inc." value={csName}
                      onChange={e => { setCsName(e.target.value); if (!csSlug) setCsSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }}
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Slug <span className="text-red-400">*</span></label>
                    <input
                      type="text" required placeholder="acme-inc" value={csSlug}
                      onChange={e => setCsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                    <input
                      type="text" placeholder="FinTech" value={csIndustry}
                      onChange={e => setCsIndustry(e.target.value)}
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
                    <select value={csStage} onChange={e => setCsStage(e.target.value)}
                      className="w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
                    >
                      <option value="">Select stage…</option>
                      <option value="idea">Idea</option>
                      <option value="mvp">MVP</option>
                      <option value="seed">Seed</option>
                      <option value="series_a">Series A</option>
                      <option value="growth">Growth</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                    <TagInput
                      value={csTagsArr}
                      onChange={setCsTagsArr}
                      suggestions={allTags}
                      placeholder="Search or create tags…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      rows={3} placeholder="What does this startup do?" value={csDescription}
                      onChange={e => setCsDescription(e.target.value)}
                      className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40 resize-none"
                    />
                  </div>
                </div>
                {csError && <p className="text-xs text-red-500">{csError}</p>}
                {csSuccess && <p className="text-xs text-green-600">{csSuccess}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" disabled={csLoading}
                    className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-60 transition-colors"
                  >
                    {csLoading ? 'Creating…' : 'Create startup'}
                  </button>
                  <button type="button" onClick={() => { setShowCreateStartup(false); setCsError(null); setCsSuccess(null) }}
                    className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {startups.length === 0 ? (
              <p className="text-sm text-gray-400">No startups yet.</p>
            ) : (
              <div className="space-y-3">
                {startups.map(s => (
                  <div key={s.id} className="px-5 py-4 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.slug ? (
                            <Link
                              href={`/dashboard/admin/${s.slug}`}
                              className="text-sm font-semibold text-[#002147] hover:underline"
                            >
                              {s.name}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold text-[#002147]">{s.name}</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{[s.industry, s.stage].filter(Boolean).join(' · ')}</p>
                        {s.preferred_tags && s.preferred_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.preferred_tags.map(t => (
                              <span key={t} className="text-[10px] bg-[#002147]/8 text-[#002147] px-2 py-0.5 rounded-full font-medium">{t}</span>
                            ))}
                          </div>
                        )}
                        {s.description && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{s.description}</p>
                        )}
                      </div>
                    </div>
                    {s.founders && s.founders.length > 0 && (
                      <div className="space-y-0.5 mt-2 pt-2 border-t border-gray-50">
                        {s.founders.map((f, i) => {
                          const actionKey = `${s.id}:${f.email}`
                          const busy = founderActionKey === actionKey
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-500 group/row rounded px-1 -mx-1 hover:bg-gray-50">
                              <span className="font-medium text-[#002147] shrink-0">{f.name}</span>
                              {f.email && <span className="truncate">{f.email}</span>}
                              {/* Controls — only visible on row hover */}
                              {f.email && (
                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                                  <select
                                    defaultValue=""
                                    disabled={busy}
                                    onChange={e => { if (e.target.value) moveFounder(f.email!, s.id, e.target.value) }}
                                    className="text-[10px] text-gray-500 border border-gray-200 rounded px-1 py-0.5 bg-white cursor-pointer disabled:opacity-40"
                                  >
                                    <option value="" disabled>Move to…</option>
                                    {startups.filter(os => os.id !== s.id).map(os => (
                                      <option key={os.id} value={os.id}>{os.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    disabled={busy}
                                    onClick={() => removeFounder(f.email!, s.id)}
                                    className="w-4 h-4 flex items-center justify-center rounded text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                                    title="Remove from startup"
                                  >
                                    {busy ? (
                                      <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin block" />
                                    ) : (
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
