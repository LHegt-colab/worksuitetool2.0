import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import {
  Calendar, CheckSquare, AlertTriangle, Users,
  ArrowRight, Clock, MapPin, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Card, { StatCard } from '@/components/ui/Card'
import Badge, { TagBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { getUpcomingMeetings } from '@/features/meetings/api'
import { getUpcomingActions, getOverdueActions } from '@/features/actions/api'
import type { V2Meeting, V2Action } from '@/types/database.types'
import { cn, priorityBgColor, formatDate } from '@/lib/utils'

const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const locale = localeMap[i18n.language] || nl

  const [meetings, setMeetings] = useState<V2Meeting[]>([])
  const [actions, setActions] = useState<V2Action[]>([])
  const [overdueActions, setOverdueActions] = useState<V2Action[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      try {
        const [m, a, o] = await Promise.all([
          getUpcomingMeetings(user!.id, 5),
          getUpcomingActions(user!.id, 8),
          getOverdueActions(user!.id),
        ])
        setMeetings(m)
        setActions(a)
        setOverdueActions(o)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const today = new Date()
  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return i18n.language === 'sv' ? 'God morgon' : i18n.language === 'en' ? 'Good morning' : 'Goedemorgen'
    if (h < 17) return i18n.language === 'sv' ? 'God dag' : i18n.language === 'en' ? 'Good afternoon' : 'Goedemiddag'
    return i18n.language === 'sv' ? 'God kväll' : i18n.language === 'en' ? 'Good evening' : 'Goedenavond'
  }

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: t('actions.status.open'),
      in_progress: t('actions.status.in_progress'),
      done: t('actions.status.done'),
      cancelled: t('actions.status.cancelled'),
    }
    return labels[status] || status
  }

  if (loading) return <PageSpinner />

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="bg-[var(--bg-sidebar)] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ background: 'radial-gradient(circle at 70% 50%, #38bdf8 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-white/60 text-sm mb-1">
            {format(today, 'EEEE d MMMM yyyy', { locale })}
          </p>
          <h2 className="text-2xl font-bold">
            {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h2>
          <p className="text-white/70 mt-1 text-sm">Hier is je dagelijkse werkoverzicht.</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueActions.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="p-2 bg-red-100 dark:bg-red-800/40 rounded-lg shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-800 dark:text-red-300 text-sm">
              {overdueActions.length} {t('dashboard.overdueWarning')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 truncate">
              {overdueActions.slice(0, 3).map(a => a.title).join(' · ')}
              {overdueActions.length > 3 && ` +${overdueActions.length - 3}`}
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => navigate('/actions')} icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
            {t('dashboard.viewAll')}
          </Button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.openActions')}
          value={actions.filter(a => a.status === 'open').length}
          icon={<CheckSquare className="h-5 w-5" />}
          iconBg="bg-primary-600"
        />
        <StatCard
          title={t('dashboard.meetingsToday')}
          value={meetings.filter(m => m.date === today.toISOString().split('T')[0]).length}
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-purple-600"
        />
        <StatCard
          title={t('dashboard.overdueActions')}
          value={overdueActions.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBg={overdueActions.length > 0 ? 'bg-red-600' : 'bg-slate-500'}
        />
        <StatCard
          title={t('dashboard.upcomingMeetings')}
          value={meetings.length}
          icon={<Calendar className="h-5 w-5" />}
          iconBg="bg-teal-600"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming meetings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{t('dashboard.upcomingMeetings')}</h3>
            </div>
            <button
              onClick={() => navigate('/meetings')}
              className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
            >
              {t('dashboard.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {meetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{t('dashboard.noMeetings')}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/meetings')}>
                + {t('meetings.newMeeting')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meetings.map(meeting => (
                <button
                  key={meeting.id}
                  onClick={() => navigate(`/meetings?id=${meeting.id}`)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg',
                    'hover:bg-[var(--bg-page)] transition-colors text-left',
                    'border border-transparent hover:border-[var(--border)]',
                  )}
                >
                  <div className="pt-0.5 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">{meeting.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(meeting.date, 'EEE d MMM', i18n.language)}
                      </span>
                      {meeting.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {meeting.start_time.slice(0, 5)}
                          {meeting.end_time && ` - ${meeting.end_time.slice(0, 5)}`}
                        </span>
                      )}
                      {meeting.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{meeting.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* My actions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{t('dashboard.myActions')}</h3>
            </div>
            <button
              onClick={() => navigate('/actions')}
              className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
            >
              {t('dashboard.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{t('dashboard.noActions')}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/actions')}>
                + {t('actions.newAction')}
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {actions.map(action => {
                const isOverdue = action.due_date && action.due_date < new Date().toISOString().split('T')[0]
                return (
                  <button
                    key={action.id}
                    onClick={() => navigate(`/actions?id=${action.id}`)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-lg',
                      'hover:bg-[var(--bg-page)] transition-colors text-left',
                    )}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      action.priority === 'urgent' ? 'bg-red-500' :
                      action.priority === 'high' ? 'bg-orange-500' :
                      action.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500',
                    )} />
                    <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{action.title}</span>
                    {action.due_date && (
                      <span className={cn(
                        'text-xs shrink-0',
                        isOverdue ? 'text-red-500 font-medium' : 'text-[var(--text-muted)]',
                      )}>
                        {formatDate(action.due_date, 'dd MMM', i18n.language)}
                      </span>
                    )}
                    <Badge variant={
                      action.priority === 'urgent' ? 'danger' :
                      action.priority === 'high' ? 'warning' :
                      action.priority === 'medium' ? 'info' : 'default'
                    } className="shrink-0 text-xs px-1.5">
                      {t(`actions.priority.${action.priority}`)}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
