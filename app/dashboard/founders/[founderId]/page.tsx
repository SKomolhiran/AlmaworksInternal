'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Founder {
  id: string
  founder_name: string
  email: string
  startup_name: string | null
  industry: string | null
  bio: string | null
  needs_tags: string[] | null
}

interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  session_number: number
  week_number: number
}

interface Mentor {
  id: string
  name: string
}

interface Meeting {
  id: string
  session_id: string
  mentor_id: string
  founder_id: string
  status: string
}

interface MeetingWithDetails extends Meeting {
  session: Session
  mentor: Mentor
}

export default function FounderProfilePage() {
  const params = useParams()
  const founderId = params.founderId as string

  const [founder, setFounder] = useState<Founder | null>(null)
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!founderId) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch founder
        const { data: founderData, error: founderError } = await supabase
          .from('founders')
          .select('*')
          .eq('id', founderId)
          .single()

        if (founderError) {
          console.error('Error fetching founder:', founderError)
          return
        }

        // Fetch meetings for this founder
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('founder_id', founderId)

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError)
        }

        if (meetingsData && meetingsData.length > 0) {
          // Fetch sessions and mentors for the meetings
          const sessionIds = [...new Set(meetingsData.map(m => m.session_id))]
          const mentorIds = [...new Set(meetingsData.map(m => m.mentor_id))]

          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('*')
            .in('id', sessionIds)

          const { data: mentorsData } = await supabase
            .from('mentors')
            .select('id, name')
            .in('id', mentorIds)

          // Combine meetings with session and mentor data
          const meetingsWithDetails: MeetingWithDetails[] = meetingsData.map(meeting => {
            const session = sessionsData?.find(s => s.id === meeting.session_id)
            const mentor = mentorsData?.find(m => m.id === meeting.mentor_id)
            return {
              ...meeting,
              session: session!,
              mentor: mentor!,
            }
          }).filter(m => m.session && m.mentor) // Filter out any incomplete data

          // Sort by date and time
          meetingsWithDetails.sort((a, b) => {
            const dateCompare = a.session.date.localeCompare(b.session.date)
            if (dateCompare !== 0) return dateCompare
            return a.session.start_time.localeCompare(b.session.start_time)
          })

          setMeetings(meetingsWithDetails)
        }

        setFounder(founderData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [founderId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return <div className="text-gray-600">Loading founder profile...</div>
  }

  if (!founder) {
    return (
      <div>
        <div className="text-gray-600 mb-4">Founder not found</div>
        <Link href="/dashboard/founders" className="text-blue-600 hover:underline">
          ← Back to Founders
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/founders" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Founders
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{founder.founder_name}</h1>
      </div>

      {/* Founder Profile */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Founder Name</span>
            <p className="text-gray-900">{founder.founder_name}</p>
          </div>
          {founder.startup_name && (
            <div>
              <span className="text-sm font-medium text-gray-500">Startup Name</span>
              <p className="text-gray-900">{founder.startup_name}</p>
            </div>
          )}
          {founder.industry && (
            <div>
              <span className="text-sm font-medium text-gray-500">Industry</span>
              <p className="text-gray-900">{founder.industry}</p>
            </div>
          )}
          {founder.bio && (
            <div>
              <span className="text-sm font-medium text-gray-500">Bio</span>
              <p className="text-gray-900 whitespace-pre-wrap">{founder.bio}</p>
            </div>
          )}
          {founder.needs_tags && founder.needs_tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-500">Needs Tags</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {founder.needs_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meetings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mentor Meetings</h2>
        {meetings.length === 0 ? (
          <div className="text-gray-500">No meetings scheduled yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mentor Name
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(meeting.session.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(meeting.session.start_time)} - {formatTime(meeting.session.end_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {meeting.mentor.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
