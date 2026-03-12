'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Founder {
  id: string
  founder_name: string
  email: string
  startup_name: string | null
  industry: string | null
  bio: string | null
  needs_tags: string[] | null
}

export default function FoundersPage() {
  const [founders, setFounders] = useState<Founder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchFounders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('founders')
        .select('*')
        .order('founder_name', { ascending: true })

      if (error) {
        console.error('Error fetching founders:', error)
        return
      }

      setFounders(data || [])
    } catch (error) {
      console.error('Error fetching founders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFounders()
  }, [])

  const handleAddFounder = () => {
    setShowForm(true)
  }

  const handleFormSubmit = async (formData: {
    founder_name: string
    email: string
    startup_name: string
    industry: string
    bio: string
    needs_tags: string
  }) => {
    try {
      const tags = formData.needs_tags
        ? formData.needs_tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : []

      const { error } = await supabase
        .from('founders')
        .insert([
          {
            founder_name: formData.founder_name,
            email: formData.email,
            startup_name: formData.startup_name || null,
            industry: formData.industry || null,
            bio: formData.bio || null,
            needs_tags: tags.length > 0 ? tags : null,
          },
        ])

      if (error) {
        console.error('Error adding founder:', error)
        alert('Error adding founder: ' + error.message)
        return
      }

      setShowForm(false)
      fetchFounders()
    } catch (error) {
      console.error('Error adding founder:', error)
      alert('Error adding founder')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Founders</h1>
        <button
          onClick={handleAddFounder}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Founder
        </button>
      </div>

      {showForm && (
        <AddFounderForm
          onClose={() => setShowForm(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {loading ? (
        <div className="text-gray-600">Loading founders...</div>
      ) : founders.length === 0 ? (
        <div className="text-gray-600">No founders yet</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Founder Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Startup Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Needs Tags
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {founders.map((founder) => (
                <tr key={founder.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {founder.founder_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {founder.startup_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {founder.industry || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {founder.needs_tags && founder.needs_tags.length > 0
                      ? founder.needs_tags.join(', ')
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

function AddFounderForm({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: {
    founder_name: string
    email: string
    startup_name: string
    industry: string
    bio: string
    needs_tags: string
  }) => void
}) {
  const [formData, setFormData] = useState({
    founder_name: '',
    email: '',
    startup_name: '',
    industry: '',
    bio: '',
    needs_tags: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      founder_name: '',
      email: '',
      startup_name: '',
      industry: '',
      bio: '',
      needs_tags: '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Add Founder</h2>
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
              Founder Name *
            </label>
            <input
              type="text"
              required
              value={formData.founder_name}
              onChange={(e) => setFormData({ ...formData, founder_name: e.target.value })}
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
              Startup Name
            </label>
            <input
              type="text"
              value={formData.startup_name}
              onChange={(e) => setFormData({ ...formData, startup_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
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
              Needs Tags (comma separated)
            </label>
            <input
              type="text"
              value={formData.needs_tags}
              onChange={(e) => setFormData({ ...formData, needs_tags: e.target.value })}
              placeholder="e.g., Marketing, Fundraising, Product Development"
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
              Add Founder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
