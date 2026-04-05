'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function MentorsPage() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchMentors = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching mentors:', error)
        return
      }

      setMentors(data || [])
    } catch (error) {
      console.error('Error fetching mentors:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMentors()
  }, [])

  const handleAddMentor = () => {
    setShowForm(true)
  }

  const handleFormSubmit = async (formData: {
    name: string
    email: string
    company: string
    title: string
    bio: string
    linkedin: string
    expertise_tags: string
  }) => {
    try {
      const tags = formData.expertise_tags
        ? formData.expertise_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : []

      const { error } = await supabase
        .from('mentors')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            company: formData.company || null,
            title: formData.title || null,
            bio: formData.bio || null,
            linkedin: formData.linkedin || null,
            expertise_tags: tags.length > 0 ? tags : null,
          },
        ])

      if (error) {
        console.error('Error adding mentor:', error)
        alert('Error adding mentor: ' + error.message)
        return
      }

      setShowForm(false)
      fetchMentors()
    } catch (error) {
      console.error('Error adding mentor:', error)
      alert('Error adding mentor')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mentors</h1>
        <button
          onClick={handleAddMentor}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Mentor
        </button>
      </div>

      {showForm && (
        <AddMentorForm
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {loading ? (
        <div className="text-gray-600">Loading mentors...</div>
      ) : mentors.length === 0 ? (
        <div className="text-gray-600">No mentors yet</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expertise Tags
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mentors.map((mentor) => (
                <tr key={mentor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {mentor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mentor.company || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {mentor.title || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {mentor.expertise_tags && mentor.expertise_tags.length > 0
                      ? mentor.expertise_tags.join(', ')
                      : '-'}
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

function AddMentorForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: {
    name: string
    email: string
    company: string
    title: string
    bio: string
    linkedin: string
    expertise_tags: string
  }) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    bio: '',
    linkedin: '',
    expertise_tags: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      name: '',
      email: '',
      company: '',
      title: '',
      bio: '',
      linkedin: '',
      expertise_tags: '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Add Mentor</h2>
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
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expertise Tags (comma separated)
            </label>
            <input
              type="text"
              value={formData.expertise_tags}
              onChange={(e) => setFormData({ ...formData, expertise_tags: e.target.value })}
              placeholder="e.g., React, TypeScript, Product Management"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              Add Mentor
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
