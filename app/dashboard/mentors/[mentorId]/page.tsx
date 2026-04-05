'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Mentor {
  id: string
  name: string
  email: string
  company: string | null
  title: string | null
  bio: string | null
  linkedin: string | null
  expertise_tags: string[] | null
}

interface Session {
  id: string
  date: string
  start_time: string
  end_time: string
  session_number: number
  week_number: number
}

interface Founder {
  id: string
  founder_name: string
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
  founder: Founder
}

export default function MentorProfilePage() {
  const params = useParams()
  const mentorId = params.mentorId as string

  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [meetings, setMeetings] = useState<MeetingWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mentorId) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch mentor
        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select('*')
          .eq('id', mentorId)
          .single()

        if (mentorError) {
          console.error('Error fetching mentor:', mentorError)
          return
        }

        // Fetch meetings for this mentor
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('mentor_id', mentorId)

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError)
        }

        if (meetingsData && meetingsData.length > 0) {
          // Fetch sessions and founders for the meetings
          const sessionIds = [...new Set(meetingsData.map(m => m.session_id))]
          const founderIds = [...new Set(meetingsData.map(m => m.founder_id))]

          const { data: sessionsData } = await supabase
            .from('sessions')
            .select('*')
            .in('id', sessionIds)

          const { data: foundersData } = await supabase
            .from('founders')
            .select('id, founder_name')
            .in('id', founderIds)

          // Combine meetings with session and founder data
          const meetingsWithDetails: MeetingWithDetails[] = meetingsData.map(meeting => {
            const session = sessionsData?.find(s => s.id === meeting.session_id)
            const founder = foundersData?.find(f => f.id === meeting.founder_id)
            return {
              ...meeting,
              session: session!,
              founder: founder!,
            }
          }).filter(m => m.session && m.founder) // Filter out any incomplete data

          // Sort by date and time
          meetingsWithDetails.sort((a, b) => {
            const dateCompare = a.session.date.localeCompare(b.session.date)
            if (dateCompare !== 0) return dateCompare
            return a.session.start_time.localeCompare(b.session.start_time)
          })

          setMeetings(meetingsWithDetails)
        }

        setMentor(mentorData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [mentorId])

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
    return <div className="text-gray-600">Loading mentor profile...</div>
  }

  if (!mentor) {
    return (
      <div>
        <div className="text-gray-600 mb-4">Mentor not found</div>
        <Link href="/dashboard/mentors" className="text-blue-600 hover:underline">
          ← Back to Mentors
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/mentors" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Mentors
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{mentor.name}</h1>
      </div>

      {/* Mentor Profile */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Name</span>
            <p className="text-gray-900">{mentor.name}</p>
          </div>
          {mentor.company && (
            <div>
              <span className="text-sm font-medium text-gray-500">Company</span>
              <p className="text-gray-900">{mentor.company}</p>
            </div>
          )}
          {mentor.title && (
            <div>
              <span className="text-sm font-medium text-gray-500">Title</span>
              <p className="text-gray-900">{mentor.title}</p>
            </div>
          )}
          {mentor.bio && (
            <div>
              <span className="text-sm font-medium text-gray-500">Bio</span>
              <p className="text-gray-900 whitespace-pre-wrap">{mentor.bio}</p>
            </div>
          )}
          {mentor.linkedin && (
            <div>
              <span className="text-sm font-medium text-gray-500">LinkedIn</span>
              <p className="text-gray-900">
                <a
                  href={mentor.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {mentor.linkedin}
                </a>
              </p>
            </div>
          )}
          {mentor.expertise_tags && mentor.expertise_tags.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-500">Expertise Tags</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {mentor.expertise_tags.map((tag, index) => (
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Meetings</h2>
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
                    Founder Name
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
                      {meeting.founder.founder_name}
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
