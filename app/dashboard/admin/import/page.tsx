'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useMemo, useState } from 'react'

// ─── CSV parser ──────────────────────────────────────────────────────────────

type OutreachCsvRow = {
  prospect_name: string
  prospect_email: string | null
  company: string | null
  linkedin_url: string | null
  expertise_tags: string[]
  status: string
  notes: string | null
}

const FIELD_ALIASES: Record<keyof OutreachCsvRow, string[]> = {
  prospect_name: ['prospect_name', 'name', 'full_name', 'contact_name'],
  prospect_email: ['prospect_email', 'email', 'contact_email'],
  company: ['company', 'organization', 'org', 'employer'],
  linkedin_url: ['linkedin_url', 'linkedin', 'linkedin_profile'],
  expertise_tags: ['expertise_tags', 'tags', 'expertise', 'topics', 'skills'],
  status: ['status', 'stage'],
  notes: ['notes', 'note', 'comments', 'comment'],
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells
}

function parseOutreachCsv(csvText: string): { rows: OutreachCsvRow[]; headers: string[] } {
  const lines = csvText.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], headers: [] }

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase())
  const colMap: Partial<Record<keyof OutreachCsvRow, number>> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [keyof OutreachCsvRow, string[]][]) {
    const idx = headers.findIndex(h => aliases.includes(h))
    if (idx >= 0) colMap[field] = idx
  }

  const rows: OutreachCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const get = (field: keyof OutreachCsvRow) => {
      const idx = colMap[field]
      return idx !== undefined ? (cells[idx] ?? '').trim() : ''
    }
    const name = get('prospect_name')
    if (!name) continue
    const tagsRaw = get('expertise_tags')
    rows.push({
      prospect_name: name,
      prospect_email: get('prospect_email') || null,
      company: get('company') || null,
      linkedin_url: get('linkedin_url') || null,
      expertise_tags: tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: get('status') || 'prospect',
      notes: get('notes') || null,
    })
  }
  return { rows, headers }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminImportPage() {
  const supabase = useMemo(() => createClient(), [])

  const [isAdmin, setIsAdmin] = useState(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [semesterId, setSemesterId] = useState<string | null>(null)

  // Step 1 – file
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<{ rows: OutreachCsvRow[]; headers: string[] } | null>(null)

  // Step 2 – preview (just uses `parsed`)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  // Step 3 – import
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState<number | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setAdminId(user.id)
      const [{ data: profile }, { data: sem }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('semesters').select('id').eq('is_active', true).maybeSingle(),
      ])
      setIsAdmin(profile?.role === 'admin')
      setSemesterId(sem?.id ?? null)
    })()
  }, [supabase])

  function onFilePick(file: File | null) {
    if (!file) return
    setParsed(null)
    setImported(null)
    setImportError(null)
    setFileName(file.name)
    void file.text().then(csvText => {
      setParsed(parseOutreachCsv(csvText))
    })
  }

  async function runImport() {
    if (!parsed || !adminId || !semesterId) return
    setImporting(true)
    setImportError(null)
    try {
      const rows = parsed.rows.map(r => ({
        prospect_name: r.prospect_name,
        prospect_email: r.prospect_email,
        company: r.company,
        linkedin_url: r.linkedin_url,
        expertise_tags: r.expertise_tags,
        status: r.status,
        notes: r.notes,
        admin_id: adminId,
        semester_id: semesterId,
      }))
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from('outreach').insert(rows.slice(i, i + 500))
        if (error) throw error
      }
      setImported(rows.length)
      setParsed(null)
      setFileName(null)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    } finally {
      setImporting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold text-[#002147]">Import</h1>
        <p className="text-sm text-gray-500 mt-2">Admins only.</p>
      </div>
    )
  }

  const canImport = !!parsed && parsed.rows.length > 0 && !!adminId && !!semesterId

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#002147]">Import Outreach</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV to populate the outreach database. Only <code className="text-[11px] bg-gray-100 px-1 rounded">prospect_name</code> is required.
        </p>
      </div>

      <div className="space-y-4">

        {/* Step 1 – Choose CSV */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
            <p className="text-sm font-semibold text-[#002147]">Choose CSV</p>
          </div>
          <p className="text-xs text-gray-500 mb-4 ml-7">
            Accepted column names (case-insensitive):{' '}
            {[
              'prospect_name / name / full_name',
              'prospect_email / email',
              'company / organization',
              'linkedin_url / linkedin',
              'expertise_tags / tags / topics',
              'status',
              'notes / comments',
            ].map((hint, i) => (
              <span key={i}>
                <code className="text-[11px] bg-gray-100 px-1 rounded">{hint}</code>
                {i < 6 ? ', ' : ''}
              </span>
            ))}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <a
              href="/templates/outreach-template.csv"
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#75AADB] hover:text-[#002147] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download template
            </a>
            <span className="text-gray-200 text-xs">|</span>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {fileName ? 'Replace file' : 'Choose CSV'}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => onFilePick(e.target.files?.[0] ?? null)}
              />
            </label>
            {fileName && (
              <span className="text-sm text-gray-600 truncate">{fileName}</span>
            )}
          </div>
        </div>

        {/* Step 2 – Dry-run preview */}
        <div className={`bg-white rounded-xl border p-5 transition-colors ${parsed ? 'border-gray-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
            <p className="text-sm font-semibold text-[#002147]">Dry-run preview</p>
          </div>

          {parsed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#002147]">{parsed.rows.length} row{parsed.rows.length !== 1 ? 's' : ''} parsed</p>
                  {parsed.headers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Detected headers: <span className="font-mono">{parsed.headers.join(', ')}</span>
                    </p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${parsed.rows.length > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {parsed.rows.length > 0 ? 'Ready' : 'No rows'}
                </span>
              </div>

              {parsed.rows.length > 0 && (
                <details open={previewExpanded} onToggle={e => setPreviewExpanded((e.target as HTMLDetailsElement).open)}>
                  <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-[#002147] transition-colors select-none">
                    Sample rows (first 5)
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['Name', 'Email', 'Company', 'Tags', 'Status'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {parsed.rows.slice(0, 5).map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-medium text-[#002147]">{r.prospect_name}</td>
                            <td className="px-3 py-2 text-gray-500">{r.prospect_email ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.company ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.expertise_tags.join(', ') || '—'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Upload a CSV in step 1 to see the preview here.</p>
          )}
        </div>

        {/* Step 3 – Import */}
        <div className={`bg-white rounded-xl border p-5 transition-colors ${canImport ? 'border-gray-100' : 'border-gray-100 opacity-50 pointer-events-none'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
            <p className="text-sm font-semibold text-[#002147]">Import</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { void runImport() }}
              disabled={importing || !canImport}
              className="px-4 py-2 bg-[#75AADB] text-[#002147] text-sm font-semibold rounded-lg hover:bg-[#75AADB]/90 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Importing…' : `Import ${parsed?.rows.length ?? 0} rows into outreach`}
            </button>
            <p className="text-xs text-gray-400">
              Active semester: <span className="font-mono">{semesterId ?? '—'}</span>
            </p>
          </div>

          {importError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{importError}</p>
          )}
        </div>

        {/* Success banner */}
        {imported !== null && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Successfully imported {imported} row{imported !== 1 ? 's' : ''} into outreach.
          </div>
        )}
      </div>
    </div>
  )
}
