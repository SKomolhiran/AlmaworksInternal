import { supabase } from '@/lib/supabase'

export default async function TestSupabasePage() {
  const { data: mentors, error } = await supabase
    .from('mentors')
    .select('*')

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Supabase</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error fetching mentors: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Supabase</h1>
      {mentors && mentors.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(mentors, null, 2)}
          </pre>
        </div>
      ) : (
        <p className="text-gray-600">No mentors found</p>
      )}
    </div>
  )
}
