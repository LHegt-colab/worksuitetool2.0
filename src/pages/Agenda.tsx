import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO
} from 'date-fns'
import { nl, enUS, sv } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Users, CheckSquare } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { getMeetings } from '@/features/meetings/api'
import { getActions } from '@/features/actions/api'
import type { V2Meeting, V2Action } from '@/types/database.types'
import { cn } from '@/lib/utils'

const localeMap: Record<string, typeof nl> = { nl, en: enUS, sv }

interface CalendarDay {
  date: Date
  meetings: V2Meeting[]
  actions: V2Action[]
  isCurrentMonth: boolean
  isToday: boolean
}

export default function Agenda() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = localeMap[i18n.language] || nl

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [meetings, setMeetings] = useState<V2Meeting[]>([])
  const [actions, setActions] = useState<V2Action[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [m, a] = await Promise.all([getMeetings(user.id), getActions(user.id)])
      setMeetings(m)
      setActions(a)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: CalendarDay[] = []
  let d = calStart
  while (d <= calEnd) {
    const dateStr = format(d, 'yyyy-MM-dd')
    days.push({
      date: d,
      meetings: meetings.filter(m => m.date === dateStr),
      actions: actions.filter(a =>
        (a.start_date === dateStr || a.due_date === dateStr) &&
        a.status !== 'done' && a.status !== 'cancelled'
      ),
      isCurrentMonth: isSameMonth(d, currentMonth),
      isToday: isSameDay(d, new Date()),
    })
    d = addDays(d, 1)
  }

  const weekDayNames = Array.from({ length: 7 }, (_, i) =>
    format(addDays(calStart, i), 'EEE', { locale })
  )

  function priorityDot(priority: string) {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] min-w-40 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-lg hover:bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
          icon={<Calendar className="h-4 w-4" />}
        >
          {t('common.today')}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 opacity-70" />
          {t('agenda.meetings')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-primary-500 opacity-70" />
          {t('agenda.actions')}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDayNames.map(name => (
            <div key={name} className="text-center text-xs font-medium text-[var(--text-muted)] py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr">
          {days.map(day => {
            const isSelected = selectedDay && isSameDay(day.date, selectedDay.date)
            const hasEvents = day.meetings.length > 0 || day.actions.length > 0
            return (
              <div
                key={format(day.date, 'yyyy-MM-dd')}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'rounded-xl p-1.5 cursor-pointer transition-all min-h-16',
                  'border',
                  day.isCurrentMonth ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-page)] opacity-60',
                  isSelected
                    ? 'border-primary-400 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                  day.isToday && !isSelected && 'border-primary-300 dark:border-primary-700',
                )}
              >
                {/* Day number */}
                <div className={cn(
                  'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-0.5',
                  day.isToday
                    ? 'bg-primary-500 text-white'
                    : day.isCurrentMonth
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]',
                )}>
                  {format(day.date, 'd')}
                </div>

                {/* Events - shown small when cell is small */}
                <div className="space-y-0.5 overflow-hidden">
                  {day.meetings.slice(0, 2).map(m => (
                    <div
                      key={m.id}
                      className="calendar-event calendar-event-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-1 py-0.5 rounded text-xs"
                      title={m.title}
                    >
                      {m.start_time && (
                        <span className="text-purple-600 dark:text-purple-400 mr-0.5 font-medium">
                          {m.start_time.slice(0, 5)}
                        </span>
                      )}
                      {m.title}
                    </div>
                  ))}

                  {day.actions.slice(0, 2).map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        'calendar-event calendar-event-sm px-1 py-0.5 rounded text-xs',
                        'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300',
                      )}
                      title={a.title}
                    >
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-0.5 mb-0.5', priorityDot(a.priority))} />
                      {a.title}
                    </div>
                  ))}

                  {(day.meetings.length + day.actions.length) > 4 && (
                    <div className="text-xs text-[var(--text-muted)] pl-1">
                      +{(day.meetings.length + day.actions.length) - 4}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (selectedDay.meetings.length > 0 || selectedDay.actions.length > 0) && (
        <Card className="shrink-0">
          <h3 className="font-semibold text-[var(--text-primary)] mb-3">
            {format(selectedDay.date, 'EEEE d MMMM yyyy', { locale })}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedDay.meetings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {t('agenda.meetings')}
                </p>
                <div className="space-y-1">
                  {selectedDay.meetings.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      {m.start_time && <span className="text-xs text-[var(--text-muted)] font-mono">{m.start_time.slice(0, 5)}</span>}
                      <span>{m.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedDay.actions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2 flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" /> {t('agenda.actions')}
                </p>
                <div className="space-y-1">
                  {selectedDay.actions.map(a => (
                    <div key={a.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', priorityDot(a.priority))} />
                      <span>{a.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

