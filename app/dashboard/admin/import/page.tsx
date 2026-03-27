'use client'

import { createClient } from '@/utils/supabase/client'
import { importNotionCsvToOutreachInserts, type NotionOutreachSource } from '@/src/outreach/importNotion'
import { useEffect, useMemo, useState } from 'react'

type Uploaded = {
  source: NotionOutreachSource
  fileName: string
  csvText: string
}

type Preview = {
  source: NotionOutreachSource
  fileName: string
  result: ReturnType<typeof importNotionCsvToOutreachInserts>
}

export default function AdminImportPage() {
  const supabase = useMemo(() => createClient(), [])

  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [adminId, setAdminId] = useState<string | null>(null)
  const [semesterId, setSemesterId] = useState<string | null>(null)

  const [uploads, setUploads] = useState<Uploaded[]>([])
  const [previews, setPreviews] = useState<Preview[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setAdminId(user.id)

      const [{ data: profile }, { data: activeSemester }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('semesters').select('id').eq('is_active', true).maybeSingle(),
      ])

      setIsAdmin(profile?.role === 'admin')
      setSemesterId(activeSemester?.id ?? null)
    })()
  }, [supabase])

  async function onPickFile(source: NotionOutreachSource, file: File | null) {
    if (!file) return
    setLoading(`Reading ${file.name}…`)
    try {
      const csvText = await file.text()
      setUploads((prev) => {
        const rest = prev.filter((u) => u.source !== source)
        return [...rest, { source, fileName: file.name, csvText }]
      })
    } finally {
      setLoading(null)
    }
  }

  function buildPreviews() {
    if (!adminId || !semesterId) return
    const next: Preview[] = []
    for (const u of uploads) {
      next.push({
        source: u.source,
        fileName: u.fileName,
        result: importNotionCsvToOutreachInserts({
          csvText: u.csvText,
          source: u.source,
          adminId,
          semesterId,
        }),
      })
    }
    setPreviews(next)
  }

  async function runImport() {
    if (!adminId || !semesterId) {
      alert('Missing admin or active semester. Ensure you are signed in as admin and have an active semester.')
      return
    }
    if (previews.length === 0) {
      alert('Build a preview first.')
      return
    }

    const allRows = previews.flatMap((p) => p.result.rows)
    if (allRows.length === 0) {
      alert('No rows to import.')
      return
    }

    setImporting(true)
    try {
      // Insert in chunks to avoid request limits.
      const chunkSize = 500
      for (let i = 0; i < allRows.length; i += chunkSize) {
        const chunk = allRows.slice(i, i + chunkSize)
        const { error } = await supabase.from('outreach').insert(chunk)
        if (error) throw error
      }
      alert(`Imported ${allRows.length} outreach rows.`)
    } catch (e) {
      console.error(e)
      alert(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
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

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#002147]">Import Outreach CSVs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload the Notion exports, preview the deduped mapping, then import into <code>public.outreach</code>.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-[#002147] mb-3">1) Upload files</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <UploadCard
              title="Current Outreach CSV"
              source="current"
              onPick={onPickFile}
              current={uploads.find((u) => u.source === 'current')?.fileName ?? null}
            />
            <UploadCard
              title="Deprecated Outreach CSV"
              source="deprecated"
              onPick={onPickFile}
              current={uploads.find((u) => u.source === 'deprecated')?.fileName ?? null}
            />
            <UploadCard
              title="Previous Mentors CSV"
              source="previous_mentors"
              onPick={onPickFile}
              current={uploads.find((u) => u.source === 'previous_mentors')?.fileName ?? null}
            />
          </div>
          {loading && <p className="text-xs text-gray-400 mt-3">{loading}</p>}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-[#002147] mb-3">2) Dry-run preview</p>
          <div className="flex items-center gap-2">
            <button
              onClick={buildPreviews}
              disabled={uploads.length === 0 || !adminId || !semesterId}
              className="px-4 py-2 bg-[#002147] text-white text-sm font-medium rounded-lg hover:bg-[#002147]/90 disabled:opacity-50 transition-colors"
            >
              Build preview
            </button>
            <div className="text-xs text-gray-500">
              Active semester: <span className="font-mono">{semesterId ?? '—'}</span>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="mt-4 space-y-3">
              {previews.map((p) => (
                <div key={p.source} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#002147] truncate">
                        {p.fileName} <span className="text-xs text-gray-400 font-normal">({p.source})</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Input {p.result.stats.input_rows} · Mapped {p.result.stats.mapped_rows} · Skipped {p.result.stats.skipped_rows} · Deduped {p.result.stats.deduped_rows}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                      {p.result.rows.length} rows
                    </span>
                  </div>
                  {p.result.warnings.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-amber-700">Warnings ({p.result.warnings.length})</summary>
                      <pre className="mt-2 text-[11px] whitespace-pre-wrap text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 max-h-48 overflow-auto">
                        {p.result.warnings.slice(0, 50).join('\n')}
                      </pre>
                    </details>
                  )}
                  {p.result.drafts.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-600">Sample (first 5)</summary>
                      <pre className="mt-2 text-[11px] whitespace-pre-wrap text-gray-700 bg-white border border-gray-100 rounded-lg p-3 max-h-64 overflow-auto">
                        {JSON.stringify(p.result.drafts.slice(0, 5), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-[#002147] mb-3">3) Import</p>
          <button
            onClick={runImport}
            disabled={importing || previews.length === 0}
            className="px-4 py-2 bg-[#75AADB] text-[#002147] text-sm font-semibold rounded-lg hover:bg-[#75AADB]/90 disabled:opacity-50 transition-colors"
          >
            {importing ? 'Importing…' : 'Import all preview rows'}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            This uses your logged-in session via the browser Supabase client, so RLS stays enforced.
          </p>
        </div>
      </div>
    </div>
  )
}

function UploadCard(props: {
  title: string
  source: NotionOutreachSource
  current: string | null
  onPick: (source: NotionOutreachSource, file: File | null) => void
}) {
  return (
    <label className="block rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#002147]">{props.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {props.current ?? 'Choose CSV…'}
          </p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
          {props.source}
        </span>
      </div>
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => props.onPick(props.source, e.target.files?.[0] ?? null)}
      />
    </label>
  )
}

