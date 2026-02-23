import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard, Calendar, CheckSquare, Users, BookOpen,
  Library, Code2, FileSpreadsheet, Settings, LogOut,
  ChevronLeft, ChevronRight, Globe, Sun, Moon, Monitor,
  BriefcaseBusiness, Calculator, Clock, Database, Umbrella,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { changeLanguage, supportedLanguages, type SupportedLanguage } from '@/i18n/index'

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

const navItems = [
  { to: '/', icon: LayoutDashboard, key: 'nav.dashboard' as const, exact: true },
  { to: '/agenda', icon: Calendar, key: 'nav.agenda' as const },
  { to: '/actions', icon: CheckSquare, key: 'nav.actions' as const },
  { to: '/meetings', icon: Users, key: 'nav.meetings' as const },
  { to: '/journal', icon: BookOpen, key: 'nav.journal' as const },
  { to: '/knowledge', icon: Library, key: 'nav.knowledge' as const },
]

const toolItems = [
  { to: '/html-preview',    icon: Code2,          key: 'nav.htmlPreview'    as const },
  { to: '/csv-converter',   icon: FileSpreadsheet, key: 'nav.csvConverter'   as const },
  { to: '/calculator',      icon: Calculator,      key: 'nav.calculator'     as const },
  { to: '/time-tracking',   icon: Clock,           key: 'nav.timeTracking'   as const },
  { to: '/vacation',        icon: Umbrella,        key: 'nav.vacation'       as const },
  { to: '/data-management', icon: Database,        key: 'nav.dataManagement' as const },
]

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const { signOut, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)

  const themeOptions: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: t('settings.themes.light') },
    { value: 'dark', icon: Moon, label: t('settings.themes.dark') },
    { value: 'system', icon: Monitor, label: t('settings.themes.system') },
  ]

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleLangChange(lang: SupportedLanguage) {
    changeLanguage(lang)
    setLangOpen(false)
  }

  const currentLang = supportedLanguages.find(l => l.code === i18n.language) || supportedLanguages[0]

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)] text-[var(--text-sidebar)]">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0',
        collapsed ? 'justify-center px-0' : '',
      )}>
        <div className="bg-primary-500 rounded-lg p-1.5 shrink-0">
          <BriefcaseBusiness className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">WorkSuite</p>
            <p className="text-xs text-white/50 leading-tight">Tool 2.0</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
        {/* Main items */}
        {navItems.map(({ to, icon: Icon, key, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onMobileClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
              'text-[var(--text-sidebar)]',
              isActive
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center px-0 w-10 mx-auto' : '',
            )}
            title={collapsed ? t(key) : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{t(key)}</span>}
          </NavLink>
        ))}

        {/* Divider */}
        <div className="my-2 mx-1 border-t border-white/10" />

        {/* Tool items */}
        {toolItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onMobileClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
              'text-[var(--text-sidebar)]',
              isActive
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center px-0 w-10 mx-auto' : '',
            )}
            title={collapsed ? t(key) : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{t(key)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="shrink-0 border-t border-white/10 px-2 py-3 space-y-0.5">
        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => { setThemeOpen(!themeOpen); setLangOpen(false) }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
              'hover:bg-white/10 text-[var(--text-sidebar-muted)] hover:text-white transition-colors',
              collapsed ? 'justify-center px-0 w-10 mx-auto' : '',
            )}
            title={collapsed ? t('common.theme') : undefined}
          >
            {theme === 'dark' ? <Moon className="h-4 w-4 shrink-0" /> :
             theme === 'light' ? <Sun className="h-4 w-4 shrink-0" /> :
             <Monitor className="h-4 w-4 shrink-0" />}
            {!collapsed && <span className="truncate">{t('common.theme')}</span>}
          </button>
          {themeOpen && (
            <div className={cn(
              'absolute bottom-full mb-1 bg-[#1a3350] rounded-lg shadow-lg border border-white/10 py-1 z-10 min-w-36',
              collapsed ? 'left-full ml-2 bottom-0' : 'left-0',
            )}>
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setTheme(opt.value); setThemeOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors',
                    theme === opt.value ? 'text-white' : 'text-white/70',
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language */}
        <div className="relative">
          <button
            onClick={() => { setLangOpen(!langOpen); setThemeOpen(false) }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
              'hover:bg-white/10 text-[var(--text-sidebar-muted)] hover:text-white transition-colors',
              collapsed ? 'justify-center px-0 w-10 mx-auto' : '',
            )}
            title={collapsed ? t('common.language') : undefined}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{currentLang.flag} {currentLang.code.toUpperCase()}</span>}
          </button>
          {langOpen && (
            <div className={cn(
              'absolute bottom-full mb-1 bg-[#1a3350] rounded-lg shadow-lg border border-white/10 py-1 z-10 min-w-36',
              collapsed ? 'left-full ml-2 bottom-0' : 'left-0',
            )}>
              {supportedLanguages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLangChange(lang.code)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors',
                    i18n.language === lang.code ? 'text-white' : 'text-white/70',
                  )}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={onMobileClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
            'text-[var(--text-sidebar-muted)] hover:bg-white/10 hover:text-white transition-colors',
            isActive && 'bg-white/20 text-white',
            collapsed ? 'justify-center px-0 w-10 mx-auto' : '',
          )}
          title={collapsed ? t('nav.settings') : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{t('nav.settings')}</span>}
        </NavLink>

        {/* User info + logout */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 mt-1',
          collapsed ? 'justify-center px-0' : '',
        )}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title={t('auth.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 items-center justify-center
                   bg-[var(--bg-sidebar)] border border-white/20 rounded-full
                   hover:bg-white/20 transition-colors text-white/70 hover:text-white"
        title={collapsed ? 'Uitklappen' : 'Inklappen'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col relative transition-all duration-300 shrink-0',
          'border-r border-[var(--border)]',
          collapsed ? 'w-16' : 'w-56',
        )}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 md:hidden flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
