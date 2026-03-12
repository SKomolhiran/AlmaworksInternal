'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  email: string
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

export default function SchedulePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [founders, setFounders] = useState<Founder[]>([])
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [openFormSessionId, setOpenFormSessionId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true })
        .order('session_number', { ascending: true })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
      }

      // Fetch founders
      const { data: foundersData, error: foundersError } = await supabase
        .from('founders')
        .select('id, founder_name, email')
        .order('founder_name', { ascending: true })

      if (foundersError) {
        console.error('Error fetching founders:', foundersError)
      }

      // Fetch mentors
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('mentors')
        .select('id, name')
        .order('name', { ascending: true })

      if (mentorsError) {
        console.error('Error fetching mentors:', mentorsError)
      }

      // Fetch meetings
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')

      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError)
      }

      setSessions(sessionsData || [])
      setFounders(foundersData || [])
      setMentors(mentorsData || [])
      setMeetings(meetingsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getMentorName = (mentorId: string): string => {
    const mentor = mentors.find((m) => m.id === mentorId)
    return mentor?.name || ''
  }

  const getFounderName = (founderId: string): string => {
    const founder = founders.find((f) => f.id === founderId)
    return founder?.founder_name || ''
  }

  const getMeetingsForSession = (sessionId: string): Meeting[] => {
    return meetings.filter((m) => m.session_id === sessionId)
  }

  const handleAddMeeting = async (
    sessionId: string,
    founderId: string,
    mentorId: string
  ) => {
    try {
      // Check if a meeting already exists with the same session_id and mentor_id
      const { data: existingSessionMentorMeetings, error: checkSessionMentorError } = await supabase
        .from('meetings')
        .select('*')
        .eq('session_id', sessionId)
        .eq('mentor_id', mentorId)

      if (checkSessionMentorError) {
        console.error('Error checking existing meetings:', checkSessionMentorError)
        alert('Error checking existing meetings: ' + checkSessionMentorError.message)
        return
      }

      if (existingSessionMentorMeetings && existingSessionMentorMeetings.length > 0) {
        alert('This mentor is already scheduled for this session.')
        return
      }

      // Check if a meeting already exists with the same mentor_id and founder_id
      const { data: existingMentorFounderMeetings, error: checkMentorFounderError } = await supabase
        .from('meetings')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('founder_id', founderId)

      if (checkMentorFounderError) {
        console.error('Error checking existing meetings:', checkMentorFounderError)
        alert('Error checking existing meetings: ' + checkMentorFounderError.message)
        return
      }

      if (existingMentorFounderMeetings && existingMentorFounderMeetings.length > 0) {
        alert('This founder has already met this mentor.')
        return
      }

      const { error } = await supabase
        .from('meetings')
        .insert([
          {
            session_id: sessionId,
            founder_id: founderId,
            mentor_id: mentorId,
            status: 'scheduled',
          },
        ])

      if (error) {
        console.error('Error adding meeting:', error)
        alert('Error adding meeting: ' + error.message)
        return
      }

      // Refresh meetings
      const { data: meetingsData } = await supabase.from('meetings').select('*')
      setMeetings(meetingsData || [])
      setOpenFormSessionId(null)
    } catch (error) {
      console.error('Error adding meeting:', error)
      alert('Error adding meeting')
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)

      if (error) {
        console.error('Error deleting meeting:', error)
        alert('Error deleting meeting: ' + error.message)
        return
      }

      // Refresh meetings
      const { data: meetingsData } = await supabase.from('meetings').select('*')
      setMeetings(meetingsData || [])
    } catch (error) {
      console.error('Error deleting meeting:', error)
      alert('Error deleting meeting')
    }
  }

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

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = []
    }
    acc[session.date].push(session)
    return acc
  }, {} as Record<string, Session[]>)

  if (loading) {
    return <div className="text-gray-600">Loading schedule...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Schedule</h1>

      {Object.keys(sessionsByDate).length === 0 ? (
        <div className="text-gray-600">No sessions scheduled yet.</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(sessionsByDate)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, dateSessions]) => (
              <div key={date} className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {formatDate(date)}
                </h2>

                {dateSessions.map((session) => {
                  const sessionMeetings = getMeetingsForSession(session.id)
                  
                  return (
                    <div key={session.id} className="mb-6 last:mb-0">
                      <div className="mb-3 text-sm text-gray-600">
                        <span className="font-medium">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </span>
                        <span className="ml-2">
                          (Session {session.session_number}, Week {session.week_number})
                        </span>
                      </div>

                      <div className="ml-4">
                        {sessionMeetings.length === 0 ? (
                          <div className="text-gray-500 text-sm mb-2">No meetings scheduled yet</div>
                        ) : (
                          <div className="space-y-2 mb-2">
                            {sessionMeetings.map((meeting) => (
                              <div
                                key={meeting.id}
                                className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
                              >
                                <span className="font-medium text-gray-900 min-w-[150px]">
                                  {getFounderName(meeting.founder_id)}
                                </span>
                                <span className="text-sm text-gray-600 flex-1">
                                  {getMentorName(meeting.mentor_id)}
                                </span>
                                <button
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Delete meeting"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <button
                          onClick={() => setOpenFormSessionId(session.id)}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add Meeting
                        </button>
                      </div>

                      {openFormSessionId === session.id && (
                        <AddMeetingForm
                          sessionId={session.id}
                          founders={founders}
                          mentors={mentors}
                          onClose={() => setOpenFormSessionId(null)}
                          onSubmit={handleAddMeeting}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function AddMeetingForm({
  sessionId,
  founders,
  mentors,
  onClose,
  onSubmit,
}: {
  sessionId: string
  founders: Founder[]
  mentors: Mentor[]
  onClose: () => void
  onSubmit: (sessionId: string, founderId: string, mentorId: string) => void
}) {
  const [formData, setFormData] = useState({
    founder_id: '',
    mentor_id: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.founder_id || !formData.mentor_id) {
      alert('Please select both a founder and a mentor')
      return
    }
    onSubmit(sessionId, formData.founder_id, formData.mentor_id)
    setFormData({
      founder_id: '',
      mentor_id: '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Founder *
            </label>
            <select
              required
              value={formData.founder_id}
              onChange={(e) => setFormData({ ...formData, founder_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select founder...</option>
              {founders.map((founder) => (
                <option key={founder.id} value={founder.id}>
                  {founder.founder_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mentor *
            </label>
            <select
              required
              value={formData.mentor_id}
              onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select mentor...</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
