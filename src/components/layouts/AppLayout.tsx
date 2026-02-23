import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sidebar from './Sidebar'

const pageTitles: Record<string, string> = {
  '/': 'nav.dashboard',
  '/agenda': 'nav.agenda',
  '/actions': 'nav.actions',
  '/meetings': 'nav.meetings',
  '/journal': 'nav.journal',
  '/knowledge': 'nav.knowledge',
  '/html-preview': 'nav.htmlPreview',
  '/csv-converter': 'nav.csvConverter',
  '/calculator': 'nav.calculator',
  '/time-tracking': 'nav.timeTracking',
  '/data-management': 'nav.dataManagement',
  '/settings': 'nav.settings',
}

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()

  const pageTitle = pageTitles[location.pathname] || 'nav.dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 md:px-6
                           bg-[var(--bg-card)] border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--bg-page)] text-[var(--text-secondary)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title */}
          <h1 className="text-lg font-semibold text-[var(--text-primary)] flex-1 truncate">
            {t(pageTitle)}
          </h1>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              className={cn(
                'p-2 rounded-lg hover:bg-[var(--bg-page)] transition-colors',
                'text-[var(--text-secondary)] relative',
              )}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
