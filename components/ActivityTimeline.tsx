'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type ActivityRow = {
  id: string
  outreach_id: string
  semester_id: string
  admin_id: string
  action_type: string
  detail: Record<string, unknown>
  created_at: string
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function renderAction(a: ActivityRow): string {
  switch (a.action_type) {
    case 'note_added':
      return String(a.detail.text ?? '')
    case 'status_changed':
      return `Status: ${a.detail.from ?? '?'} → ${a.detail.to ?? '?'}`
    case 'converted':
      return 'Converted to mentor'
    case 'field_updated':
      return `Updated ${a.detail.field ?? 'field'}`
    case 'created':
      return 'Prospect created'
    default:
      return a.action_type
  }
}

const ACTION_ICONS: Record<string, string> = {
  note_added: 'text-blue-500',
  status_changed: 'text-amber-500',
  converted: 'text-green-600',
  field_updated: 'text-gray-400',
  created: 'text-[#002147]',
}

export default function ActivityTimeline({
  outreachId,
  semesterId,
}: {
  outreachId: string
  semesterId: string
}) {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [posting, setPosting] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    async function fetchActivities() {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token || cancelled) { setLoading(false); return }

      const res = await fetch(`/api/admin/outreach/activity?outreachId=${encodeURIComponent(outreachId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!cancelled && res.ok) {
        const json = await res.json()
        setActivities(json.activities ?? [])
      }
      if (!cancelled) setLoading(false)
    }
    void fetchActivities()
    return () => { cancelled = true }
  }, [outreachId, supabase])

  async function addNote() {
    if (!noteText.trim()) return
    setPosting(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setPosting(false); return }

    const res = await fetch('/api/admin/outreach/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        outreachId,
        semesterId,
        actionType: 'note_added',
        detail: { text: noteText.trim() },
      }),
    })
    if (res.ok) {
      const json = await res.json()
      setActivities(prev => [json.activity, ...prev])
      setNoteText('')
    }
    setPosting(false)
  }

  const visible = expanded ? activities : activities.slice(0, 5)

  return (
    <div className="border-t border-gray-100 pt-3 mt-3">
      <p className="text-xs font-semibold text-gray-600 mb-2">Activity timeline</p>

      {/* Add note */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Add a note..."
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void addNote() }}
          className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#75AADB]/40"
        />
        <button
          onClick={() => void addNote()}
          disabled={posting || !noteText.trim()}
          className="px-3 py-1.5 bg-[#002147] text-white text-xs font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
        >
          {posting ? 'Adding...' : 'Add'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-12">
          <div className="w-4 h-4 border-2 border-[#002147] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-gray-400">No activity yet.</p>
      ) : (
        <div className="space-y-0">
          {visible.map((a, i) => (
            <div key={a.id} className="flex gap-2 items-start py-1.5">
              {/* Timeline dot + line */}
              <div className="flex flex-col items-center pt-1">
                <div className={`w-2 h-2 rounded-full ${ACTION_ICONS[a.action_type] ? ACTION_ICONS[a.action_type].replace('text-', 'bg-') : 'bg-gray-300'}`} />
                {i < visible.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs leading-relaxed ${a.action_type === 'note_added' ? 'text-gray-700' : 'text-gray-500 italic'}`}>
                  {renderAction(a)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{relativeTime(a.created_at)}</p>
              </div>
            </div>
          ))}
          {activities.length > 5 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-[#002147] hover:underline mt-1"
            >
              {expanded ? 'Show less' : `Show all (${activities.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
