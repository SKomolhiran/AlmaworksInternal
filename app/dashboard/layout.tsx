import NavLink from './components/NavLink'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/dashboard/mentors">Mentors</NavLink>
            <NavLink href="/dashboard/founders">Founders</NavLink>
            <NavLink href="/dashboard/sessions">Sessions</NavLink>
            <NavLink href="/dashboard/schedule">Schedule</NavLink>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
