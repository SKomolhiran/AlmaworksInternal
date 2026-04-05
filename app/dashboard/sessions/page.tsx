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

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true })
        .order('session_number', { ascending: true })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      setSessions(data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const getNextFriday = (): Date => {
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 5 = Friday
    
    let daysUntilFriday: number
    if (currentDay === 5) {
      // If today is Friday, get next Friday (7 days)
      daysUntilFriday = 7
    } else if (currentDay < 5) {
      // If before Friday, get this week's Friday
      daysUntilFriday = 5 - currentDay
    } else {
      // If Saturday (6), get next Friday
      daysUntilFriday = 6
    }
    
    const nextFriday = new Date(today)
    nextFriday.setDate(today.getDate() + daysUntilFriday)
    nextFriday.setHours(0, 0, 0, 0) // Reset time to midnight
    
    return nextFriday
  }

  const generateSessions = async () => {
    try {
      setGenerating(true)
      
      const startDate = getNextFriday()
      const sessionsToInsert: Omit<Session, 'id'>[] = []

      // Generate 8 weeks of sessions
      for (let week = 1; week <= 8; week++) {
        const sessionDate = new Date(startDate)
        sessionDate.setDate(startDate.getDate() + (week - 1) * 7)

        // Format date as YYYY-MM-DD
        const dateStr = sessionDate.toISOString().split('T')[0]

        // Session 1: 3:30 PM - 4:15 PM
        sessionsToInsert.push({
          date: dateStr,
          start_time: '15:30:00',
          end_time: '16:15:00',
          session_number: 1,
          week_number: week,
        })

        // Session 2: 4:15 PM - 5:00 PM
        sessionsToInsert.push({
          date: dateStr,
          start_time: '16:15:00',
          end_time: '17:00:00',
          session_number: 2,
          week_number: week,
        })
      }

      const { error } = await supabase
        .from('sessions')
        .insert(sessionsToInsert)

      if (error) {
        console.error('Error generating sessions:', error)
        alert('Error generating sessions: ' + error.message)
        return
      }

      fetchSessions()
    } catch (error) {
      console.error('Error generating sessions:', error)
      alert('Error generating sessions')
    } finally {
      setGenerating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
        <button
          onClick={generateSessions}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate Program Sessions'}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="text-gray-600">No sessions yet. Click &quot;Generate Program Sessions&quot; to create sessions.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Week {session.week_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(session.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Session {session.session_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
